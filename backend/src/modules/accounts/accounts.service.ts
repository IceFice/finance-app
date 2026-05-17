import { userQuery, withUserContext } from '../../db/context';
import { NotFoundError } from '../../lib/errors';
import type { CreateAccountInput, UpdateAccountInput } from './accounts.schema';

interface AccountRow {
  id: string; user_id: string; name: string; type: string;
  currency: string; balance: string; color: string | null;
  icon: string | null; is_active: boolean; created_at: Date; updated_at: Date;
}

function mapAccount(row: AccountRow) {
  return {
    id: row.id, name: row.name, type: row.type,
    currency: row.currency, balance: row.balance,
    color: row.color, icon: row.icon, isActive: row.is_active,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function list(userId: string) {
  const res = await userQuery<AccountRow>(
    userId,
    `SELECT * FROM accounts WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`,
    [userId]
  );
  return res.rows.map(mapAccount);
}

export async function getById(userId: string, accountId: string) {
  // RLS scopes this to the caller; a foreign id simply returns no row → 404.
  const res = await userQuery<AccountRow>(
    userId,
    `SELECT * FROM accounts WHERE id = $1 AND deleted_at IS NULL`,
    [accountId]
  );
  if (!res.rows[0] || res.rows[0].user_id !== userId) throw new NotFoundError('Account');
  return mapAccount(res.rows[0]);
}

export async function create(userId: string, input: CreateAccountInput) {
  const res = await userQuery<AccountRow>(
    userId,
    `INSERT INTO accounts (user_id, name, type, currency, balance, color, icon)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, input.name, input.type, input.currency, input.balance, input.color ?? null, input.icon ?? null]
  );
  return mapAccount(res.rows[0]);
}

export async function update(userId: string, accountId: string, input: UpdateAccountInput) {
  return withUserContext(userId, async (db) => {
    const check = await db.query<AccountRow>(
      `SELECT * FROM accounts WHERE id = $1 AND deleted_at IS NULL`,
      [accountId]
    );
    if (!check.rows[0]) throw new NotFoundError('Account');

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (input.name !== undefined) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (input.type !== undefined) { fields.push(`type = $${i++}`); values.push(input.type); }
    if (input.currency !== undefined) { fields.push(`currency = $${i++}`); values.push(input.currency); }
    if (input.balance !== undefined) { fields.push(`balance = $${i++}`); values.push(input.balance); }
    if (input.color !== undefined) { fields.push(`color = $${i++}`); values.push(input.color); }
    if (input.icon !== undefined) { fields.push(`icon = $${i++}`); values.push(input.icon); }
    if (fields.length === 0) return mapAccount(check.rows[0]);
    values.push(accountId);
    const res = await db.query<AccountRow>(
      // RLS guarantees only the owner's row is affected; user_id added as
      // explicit defence-in-depth.
      `UPDATE accounts SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return mapAccount(res.rows[0]);
  });
}

export async function remove(userId: string, accountId: string) {
  return withUserContext(userId, async (db) => {
    const res = await db.query(
      `UPDATE accounts SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [accountId]
    );
    if (res.rowCount === 0) throw new NotFoundError('Account');
  });
}
