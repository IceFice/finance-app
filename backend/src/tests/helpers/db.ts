import { pool } from '../../db/pool';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const BCRYPT_ROUNDS = 4; // fast rounds for tests only

/** Create a user and return their id + plain-text password */
export async function createTestUser(opts: {
  email?: string;
  password?: string;
  fullName?: string;
} = {}) {
  const email    = opts.email    ?? `test-${crypto.randomUUID()}@example.com`;
  const password = opts.password ?? 'TestPassword123!';
  const fullName = opts.fullName ?? 'Test User';
  const hash     = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const res = await pool.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, full_name)
     VALUES ($1, $2, $3) RETURNING id`,
    [email, hash, fullName]
  );
  return { id: res.rows[0].id, email, password, fullName };
}

/** Create a bank account for a user */
export async function createTestAccount(userId: string, opts: {
  name?: string;
  type?: string;
  currency?: string;
  balance?: string;
} = {}) {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO accounts (user_id, name, type, currency, balance)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      userId,
      opts.name ?? 'Test Checking',
      opts.type ?? 'checking',
      opts.currency ?? 'USD',
      opts.balance ?? '1000.00',
    ]
  );
  return res.rows[0].id;
}

/** Create a category (system category visible to all, or custom for a user) */
export async function createTestCategory(opts: {
  userId?: string;
  name?: string;
  type?: string;
  color?: string;
} = {}) {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO categories (user_id, name, type, color, is_system)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      opts.userId ?? null,
      opts.name ?? 'Test Category',
      opts.type ?? 'expense',
      opts.color ?? '#6B7280',
      opts.userId == null,
    ]
  );
  return res.rows[0].id;
}

/** Create a transaction */
export async function createTestTransaction(userId: string, accountId: string, opts: {
  amount?: string;
  type?: 'credit' | 'debit';
  date?: string;
  categoryId?: string;
  description?: string;
} = {}) {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO transactions
       (user_id, account_id, amount, currency, exchange_rate, type, description, date)
     VALUES ($1,$2,$3,'USD',1,$4,$5,$6) RETURNING id`,
    [
      userId,
      accountId,
      opts.amount ?? '100.00',
      opts.type ?? 'debit',
      opts.description ?? 'Test transaction',
      opts.date ?? new Date().toISOString().slice(0, 10),
    ]
  );
  return res.rows[0].id;
}

/** Delete a user and all their data (cascade) */
export async function deleteTestUser(userId: string) {
  // Hard delete cascades via FK constraints (ON DELETE CASCADE on all child tables)
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
}

/** Issue a login and return tokens (for integration test auth setup) */
export async function loginTestUser(agent: import('supertest').Agent, email: string, password: string) {
  const res = await agent
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return {
    accessToken: res.body.data.accessToken as string,
    // refresh cookie is set automatically on the agent
  };
}
