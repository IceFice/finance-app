import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { config } from '../../config';
import { ConflictError, UnauthorizedError, NotFoundError, DomainError } from '../../lib/errors';
import { sendEmail } from '../../lib/mailer';
import type { RegisterInput, LoginInput } from './auth.schema';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access' }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

async function storeRefreshToken(
  client: PoolClient,
  userId: string,
  token: string,
  familyId: string,
  meta: SessionMeta = {}
): Promise<void> {
  const hashed = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, family_id, user_agent, ip, last_used_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [userId, hashed, expiresAt, familyId, meta.userAgent ?? null, meta.ip ?? null]
  );
}

export async function register(input: RegisterInput, meta: SessionMeta = {}) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [input.email]);
  if ((existing.rowCount ?? 0) > 0) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, config.BCRYPT_ROUNDS);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id`,
      [input.email, passwordHash, input.fullName]
    );
    const userId = userRes.rows[0].id;
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(client, userId, refreshToken);
    await client.query('COMMIT');

    const accessToken = signAccessToken(userId);
    return { accessToken, refreshToken, userId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function login(input: LoginInput, meta: SessionMeta = {}) {
  const userRes = await pool.query<{
    id: string; password_hash: string; failed_login_attempts: number; locked_until: Date | null;
  }>(
    `SELECT id, password_hash, failed_login_attempts, locked_until
     FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [input.email]
  );

  const user = userRes.rows[0];

  // Timing-safe: always run bcrypt even if user not found (prevents user enumeration via timing)
  const dummyHash = '$2b$12$invalidhashfortimingprotection000000000000000000000000000';
  const hashToCheck = user?.password_hash ?? dummyHash;
  const valid = await bcrypt.compare(input.password, hashToCheck);

  // Check lockout BEFORE revealing whether the password matched.
  // Always use the same error message to prevent information leakage.
  if (!user || !valid || (user.locked_until && user.locked_until > new Date())) {
    if (user && valid) {
      // Password correct but account locked — do not reveal this distinction
    } else if (user) {
      // Single atomic statement: the lock decision uses the POST-increment
      // count (failed_login_attempts + 1) so the account locks exactly on the
      // 5th consecutive failure. Postgres serializes the row UPDATE, so
      // concurrent wrong logins increment correctly.
      await pool.query(
        `UPDATE users
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE
                  WHEN failed_login_attempts + 1 >= 5
                  THEN NOW() + INTERVAL '15 minutes'
                  ELSE locked_until
                END
          WHERE id = $1`,
        [user.id]
      );
    }
    throw new UnauthorizedError('Invalid email or password');
  }

  await pool.query(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1`, [user.id]);

  const refreshToken = generateRefreshToken();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await storeRefreshToken(client, user.id, refreshToken);
    await client.query('COMMIT');
  } finally {
    client.release();
  }

  return { accessToken: signAccessToken(user.id), refreshToken, userId: user.id };
}

export async function refresh(token: string, meta: SessionMeta = {}) {
  const hashed = hashToken(token);
  // Fetch the token REGARDLESS of revoked state so we can detect reuse.
  const res = await pool.query<{
    user_id: string; expires_at: Date; revoked_at: Date | null; family_id: string;
  }>(
    `SELECT user_id, expires_at, revoked_at, family_id FROM refresh_tokens WHERE token_hash = $1`,
    [hashed]
  );
  const row = res.rows[0];
  if (!row) throw new UnauthorizedError('Invalid or expired refresh token');

  // ── Theft detection ──────────────────────────────────────────────────────
  // A revoked token being presented again means one of:
  //   (a) the rightful client retried a request (rare), or
  //   (b) an attacker is replaying a stolen-but-rotated token.
  // We can't tell them apart, so we fail safe: nuke the whole family. The
  // legitimate user is forced to log in again; the attacker's stolen token
  // is now worthless.
  if (row.revoked_at) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE family_id = $1 AND revoked_at IS NULL`,
      [row.family_id]
    );
    console.warn(`[auth] refresh-token reuse detected — revoked family ${row.family_id} for user ${row.user_id}`);
    throw new UnauthorizedError('Session expired for security reasons. Please log in again.');
  }

  if (row.expires_at < new Date()) throw new UnauthorizedError('Invalid or expired refresh token');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [hashed]);
    const newRefresh = generateRefreshToken();
    // Rotate within the SAME family + carry forward session metadata.
    await storeRefreshToken(client, row.user_id, newRefresh, row.family_id, meta);
    await client.query('COMMIT');
    return { accessToken: signAccessToken(row.user_id), refreshToken: newRefresh };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Sessions ────────────────────────────────────────────────────────────────
// Each active (non-revoked, non-expired) refresh token = one live session.
// Rotation keeps exactly one active token per family, so listing active tokens
// effectively lists devices/sessions.

export interface SessionRow {
  familyId: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  isCurrent: boolean;
}

export async function listSessions(userId: string, currentToken?: string): Promise<SessionRow[]> {
  const currentHash = currentToken ? hashToken(currentToken) : null;
  const res = await pool.query<{
    family_id: string; token_hash: string; user_agent: string | null;
    ip: string | null; created_at: Date; last_used_at: Date | null;
  }>(
    `SELECT family_id, token_hash, user_agent, ip, created_at, last_used_at
     FROM refresh_tokens
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_used_at DESC NULLS LAST, created_at DESC`,
    [userId]
  );
  return res.rows.map((r) => ({
    familyId: r.family_id,
    userAgent: r.user_agent,
    ip: r.ip,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    isCurrent: currentHash != null && r.token_hash === currentHash,
  }));
}

export async function revokeSession(userId: string, familyId: string): Promise<void> {
  // user_id in the WHERE clause is the ownership guard — you can only kill
  // your own sessions.
  const res = await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND family_id = $2 AND revoked_at IS NULL`,
    [userId, familyId]
  );
  if (res.rowCount === 0) throw new NotFoundError('Session');
}

export async function revokeOtherSessions(userId: string, currentToken?: string): Promise<number> {
  const currentHash = currentToken ? hashToken(currentToken) : null;
  // Find the family of the current session so we keep it alive.
  let keepFamily: string | null = null;
  if (currentHash) {
    const cur = await pool.query<{ family_id: string }>(
      `SELECT family_id FROM refresh_tokens WHERE token_hash = $1`,
      [currentHash]
    );
    keepFamily = cur.rows[0]?.family_id ?? null;
  }
  const res = await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL
       AND ($2::uuid IS NULL OR family_id <> $2)`,
    [userId, keepFamily]
  );
  return res.rowCount ?? 0;
}

export async function logout(token: string) {
  const hashed = hashToken(token);
  await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [hashed]);
}

export async function getProfile(userId: string) {
  const res = await pool.query<{ id: string; email: string; full_name: string; default_currency: string; timezone: string; created_at: Date }>(
    `SELECT id, email, full_name, default_currency, timezone, created_at FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!res.rows[0]) throw new NotFoundError('User');
  const u = res.rows[0];
  return { id: u.id, email: u.email, fullName: u.full_name, defaultCurrency: u.default_currency, timezone: u.timezone, createdAt: u.created_at };
}

// ── Forgot / reset password ───────────────────────────────────────────────
// Important: requestPasswordReset always succeeds from the caller's POV
// (no information disclosure about whether the email is registered). We
// generate a token only when the user exists; the response is identical
// either way.

const RESET_TOKEN_TTL_MIN = 30;

export async function requestPasswordReset(email: string, requestIp: string | undefined) {
  const userRes = await pool.query<{ id: string; full_name: string }>(
    `SELECT id, full_name FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );
  const user = userRes.rows[0];
  if (!user) return;  // silent no-op — caller still gets 200

  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000);
  // Invalidate any prior unused tokens for this user — only the latest works.
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id]
  );
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, request_ip)
     VALUES ($1, $2, $3, $4)`,
    [user.id, tokenHash, expiresAt, requestIp ?? null]
  );

  const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
  const body = [
    `Привет, ${user.full_name || 'пользователь'}!`,
    '',
    'Кто-то (надеемся, вы) попросил сбросить пароль в Бабкосчёте.',
    'Ссылка действует 30 минут:',
    '',
    resetUrl,
    '',
    'Если это были не вы — просто проигнорируйте это письмо.',
    '— Бабкосчёт',
  ].join('\n');
  await sendEmail({
    to: email,
    subject: 'Сброс пароля — Бабкосчёт',
    text: body,
    html: `<p>Привет, <b>${user.full_name || 'пользователь'}</b>!</p>
<p>Кто-то (надеемся, вы) попросил сбросить пароль в Бабкосчёте.</p>
<p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#6366F1;color:#fff;text-decoration:none">Сбросить пароль</a></p>
<p>Ссылка действует 30 минут.</p>
<p style="color:#888;font-size:12px">Если это были не вы — просто проигнорируйте это письмо.</p>`,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const res = await pool.query<{ id: string; user_id: string; expires_at: Date; used_at: Date | null }>(
    `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
    [tokenHash]
  );
  const row = res.rows[0];
  if (!row) throw new UnauthorizedError('Invalid or expired reset link');
  if (row.used_at) throw new UnauthorizedError('Reset link already used');
  if (row.expires_at < new Date()) throw new UnauthorizedError('Reset link expired — request a new one');

  const newHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
  // Atomic: mark token used, set password, revoke any active refresh tokens
  // for the user (force re-login on every other device).
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [row.id]);
    await client.query(
      `UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2`,
      [newHash, row.user_id]
    );
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [row.user_id]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const res = await pool.query<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
  if (!res.rows[0]) throw new NotFoundError('User');
  const valid = await bcrypt.compare(currentPassword, res.rows[0].password_hash);
  if (!valid) throw new DomainError('Current password is incorrect');
  const newHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
  await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}
