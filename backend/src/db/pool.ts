import { Pool, PoolClient } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  min: config.DATABASE_POOL_MIN,
  max: config.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('Unexpected pg pool error', err);
});

export async function query<T = unknown>(
  text: string,
  values?: unknown[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now();
  const res = await pool.query(text, values);
  if (config.NODE_ENV === 'development') {
    console.debug(`[SQL] ${Date.now() - start}ms — ${text.slice(0, 100)}`);
  }
  return res as { rows: T[]; rowCount: number | null };
}

export type { PoolClient };
