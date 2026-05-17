import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { config } from '../../config';
import { ConflictError, UnauthorizedError, NotFoundError, DomainError } from '../../lib/errors';
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

async function storeRefreshToken(client: PoolClient, userId: string, token: string): Promise<void> {
  const hashed = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashed, expiresAt]
  );
}

export async function register(input: RegisterInput) {
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

export async function login(input: LoginInput) {
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

export async function refresh(token: string) {
  const hashed = hashToken(token);
  const res = await pool.query<{ user_id: string; expires_at: Date }>(
    `SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashed]
  );
  const row = res.rows[0];
  if (!row || row.expires_at < new Date()) throw new UnauthorizedError('Invalid or expired refresh token');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [hashed]);
    const newRefresh = generateRefreshToken();
    await storeRefreshToken(client, row.user_id, newRefresh);
    await client.query('COMMIT');
    return { accessToken: signAccessToken(row.user_id), refreshToken: newRefresh };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const res = await pool.query<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
  if (!res.rows[0]) throw new NotFoundError('User');
  const valid = await bcrypt.compare(currentPassword, res.rows[0].password_hash);
  if (!valid) throw new DomainError('Current password is incorrect');
  const newHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
  await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}
