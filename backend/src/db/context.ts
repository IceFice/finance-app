import { pool, PoolClient } from './pool';

/**
 * Runs `fn` inside a transaction scoped to a single PostgreSQL connection
 * with Row-Level Security active for `userId`.
 *
 * - `SET` cannot be parameterized in Postgres, so the user id is applied via
 *   `set_config(..., is_local => true)` (transaction-scoped, like SET LOCAL).
 * - `SET LOCAL ROLE app_user` drops superuser/owner privileges so RLS
 *   policies (FORCE ROW LEVEL SECURITY) actually apply to every statement.
 * - Everything runs on ONE client checked out of the pool, so the context
 *   and the queries share the same session (the classic RLS pitfall).
 */
export async function withUserContext<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
    await client.query('SET LOCAL ROLE app_user');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Convenience for single-statement, RLS-scoped reads/writes. */
export async function userQuery<T = unknown>(
  userId: string,
  text: string,
  values?: unknown[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  return withUserContext(userId, async (client) => {
    const res = await client.query(text, values);
    return { rows: res.rows as T[], rowCount: res.rowCount };
  });
}
