import { pool } from '../../db/pool';
import { encodeCursor, decodeCursor } from '../../lib/cursor';
import { NotFoundError, DomainError } from '../../lib/errors';
import type { CreateTransactionInput, UpdateTransactionInput, CreateTransferInput, ListQuery } from './transactions.schema';

interface TransactionRow {
  id: string; user_id: string; account_id: string; category_id: string | null;
  transfer_pair_id: string | null; amount: string; amount_base: string;
  currency: string; exchange_rate: string; type: string;
  description: string | null; merchant: string | null; date: string;
  notes: string | null; created_at: Date; updated_at: Date;
  category_name?: string; category_color?: string; account_name?: string;
}

function mapRow(row: TransactionRow) {
  return {
    id: row.id, accountId: row.account_id, categoryId: row.category_id,
    transferPairId: row.transfer_pair_id, amount: row.amount, amountBase: row.amount_base,
    currency: row.currency, exchangeRate: row.exchange_rate, type: row.type,
    description: row.description, merchant: row.merchant,
    date: String(row.date).slice(0, 10),
    notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
    categoryName: row.category_name ?? null, categoryColor: row.category_color ?? null,
    accountName: row.account_name ?? null,
  };
}

export async function list(userId: string, query: ListQuery) {
  const params: unknown[] = [userId];
  const conditions: string[] = ['t.user_id = $1', 't.deleted_at IS NULL'];
  let i = 2;

  if (query.from) { conditions.push(`t.date >= $${i++}`); params.push(query.from); }
  if (query.to) { conditions.push(`t.date <= $${i++}`); params.push(query.to); }
  if (query.accountId) { conditions.push(`t.account_id = $${i++}`); params.push(query.accountId); }
  if (query.categoryId) { conditions.push(`t.category_id = $${i++}`); params.push(query.categoryId); }
  if (query.type) { conditions.push(`t.type = $${i++}`); params.push(query.type); }
  if (query.search) {
    conditions.push(`(t.description ILIKE $${i} OR t.merchant ILIKE $${i})`);
    params.push(`%${query.search}%`); i++;
  }

  if (query.cursor) {
    const { date, id } = decodeCursor(query.cursor);
    conditions.push(`(t.date < $${i} OR (t.date = $${i} AND t.id < $${i + 1}))`);
    params.push(date, id); i += 2;
  }

  const where = conditions.join(' AND ');
  const limit = query.limit + 1;
  params.push(limit);

  const sql = `
    SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE ${where}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT $${i}
  `;

  const res = await pool.query<TransactionRow>(sql, params);
  const hasMore = res.rows.length > query.limit;
  const rows = hasMore ? res.rows.slice(0, query.limit) : res.rows;
  const last = rows[rows.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor(String(last.date).slice(0, 10), last.id)
    : null;

  return { data: rows.map(mapRow), pagination: { nextCursor, hasMore, limit: query.limit } };
}

export async function getById(userId: string, transactionId: string) {
  const res = await pool.query<TransactionRow>(
    `SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN accounts a ON a.id = t.account_id
     WHERE t.id = $1 AND t.deleted_at IS NULL`,
    [transactionId]
  );
  // Return 404 regardless of whether the record doesn't exist or belongs to another
  // user — never reveal the existence of other users' resources (security best practice).
  if (!res.rows[0] || res.rows[0].user_id !== userId) throw new NotFoundError('Transaction');
  return mapRow(res.rows[0]);
}

export async function create(userId: string, input: CreateTransactionInput) {
  const res = await pool.query<TransactionRow>(
    `INSERT INTO transactions
     (user_id, account_id, category_id, amount, currency, exchange_rate, type, description, merchant, date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [userId, input.accountId, input.categoryId ?? null, input.amount, input.currency,
     input.exchangeRate, input.type, input.description ?? null, input.merchant ?? null,
     input.date, input.notes ?? null]
  );
  return mapRow(res.rows[0]);
}

export async function update(userId: string, transactionId: string, input: UpdateTransactionInput) {
  await getById(userId, transactionId);
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const map: Record<string, string> = {
    accountId: 'account_id', categoryId: 'category_id', amount: 'amount',
    currency: 'currency', exchangeRate: 'exchange_rate', type: 'type',
    description: 'description', merchant: 'merchant', date: 'date', notes: 'notes',
  };
  for (const [key, col] of Object.entries(map)) {
    if ((input as Record<string, unknown>)[key] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push((input as Record<string, unknown>)[key]);
    }
  }
  if (fields.length === 0) return getById(userId, transactionId);
  values.push(transactionId);
  const res = await pool.query<TransactionRow>(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values
  );
  return mapRow(res.rows[0]);
}

export async function softDelete(userId: string, transactionId: string) {
  // Atomic guard: a single UPDATE that only matches an owned, not-yet-deleted
  // row. Under concurrent deletes exactly one request affects the row (200);
  // the loser matches 0 rows and gets 404. Also covers not-found / not-owner.
  const res = await pool.query(
    `UPDATE transactions SET deleted_at = NOW()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [transactionId, userId]
  );
  if (res.rowCount === 0) throw new NotFoundError('Transaction');
}

export async function createTransfer(userId: string, input: CreateTransferInput) {
  if (input.fromAccountId === input.toAccountId) throw new DomainError('Cannot transfer to same account');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const debitRes = await client.query<{ id: string }>(
      `INSERT INTO transactions (user_id, account_id, amount, currency, type, description, date)
       VALUES ($1,$2,$3,$4,'transfer',$5,$6) RETURNING id`,
      [userId, input.fromAccountId, input.amount, input.currency, input.description ?? 'Transfer', input.date]
    );
    const debitId = debitRes.rows[0].id;
    const creditRes = await client.query<{ id: string }>(
      `INSERT INTO transactions (user_id, account_id, amount, currency, type, description, date, transfer_pair_id)
       VALUES ($1,$2,$3,$4,'transfer',$5,$6,$7) RETURNING id`,
      [userId, input.toAccountId, input.amount, input.currency, input.description ?? 'Transfer', input.date, debitId]
    );
    const creditId = creditRes.rows[0].id;
    await client.query(`UPDATE transactions SET transfer_pair_id = $1 WHERE id = $2`, [creditId, debitId]);
    await client.query('COMMIT');
    return { debitId, creditId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
