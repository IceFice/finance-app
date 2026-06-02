import { userQuery, withUserContext } from '../../db/context';
import { NotFoundError } from '../../lib/errors';
import { buildPartialUpdate } from '../../lib/sqlUpdate';
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

    const { setClause, values, nextParam } = buildPartialUpdate({
      name: input.name,
      type: input.type,
      currency: input.currency,
      balance: input.balance,
      color: input.color,
      icon: input.icon,
    });
    if (!setClause) return mapAccount(check.rows[0]);
    // RLS guarantees only the owner's row is affected; the id WHERE is the
    // explicit selector.
    const res = await db.query<AccountRow>(
      `UPDATE accounts SET ${setClause} WHERE id = $${nextParam} RETURNING *`,
      [...values, accountId]
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
