import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { userQuery, withUserContext } from '../../db/context';
import { NotFoundError } from '../../lib/errors';
import { buildPartialUpdate } from '../../lib/sqlUpdate';
import type { CreateRecurringInput, UpdateRecurringInput, Frequency } from './recurring.schema';

interface Row {
  id: string; user_id: string; account_id: string; category_id: string | null;
  amount: string; currency: string; type: string;
  description: string | null; merchant: string | null;
  frequency: Frequency; start_date: string; end_date: string | null;
  next_due_date: string; last_applied_at: Date | null;
  is_active: boolean; created_at: Date; updated_at: Date;
  account_name?: string; category_name?: string; category_color?: string;
}

function map(r: Row) {
  return {
    id: r.id, accountId: r.account_id, categoryId: r.category_id,
    amount: r.amount, currency: r.currency, type: r.type,
    description: r.description, merchant: r.merchant,
    frequency: r.frequency,
    startDate: String(r.start_date).slice(0, 10),
    endDate: r.end_date ? String(r.end_date).slice(0, 10) : null,
    nextDueDate: String(r.next_due_date).slice(0, 10),
    lastAppliedAt: r.last_applied_at,
    isActive: r.is_active,
    accountName: r.account_name ?? null,
    categoryName: r.category_name ?? null,
    categoryColor: r.category_color ?? null,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

// Add one frequency period to a date. Pure — used for next_due bumps and
// also for the initial next_due value when creating a row.
export function bumpDate(date: Date, freq: Frequency): Date {
  const d = new Date(date.getTime());
  switch (freq) {
    case 'daily':     d.setDate(d.getDate() + 1); break;
    case 'weekly':    d.setDate(d.getDate() + 7); break;
    case 'biweekly':  d.setDate(d.getDate() + 14); break;
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

function toIsoDate(d: Date): string {
  // YYYY-MM-DD in local time — same convention as transactions.date.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const SELECT_JOINED = `
  SELECT r.*, a.name AS account_name, c.name AS category_name, c.color AS category_color
  FROM recurring_transactions r
  JOIN accounts a   ON a.id = r.account_id AND a.deleted_at IS NULL
  LEFT JOIN categories c ON c.id = r.category_id
`;

// Fetch + map on a caller-supplied client. Critical: create()/update() do
// their write inside withUserContext and then need to return the joined
// shape *on the same connection* — a fresh pool connection wouldn't yet see
// the uncommitted INSERT/UPDATE and would 404.
async function getByIdOnClient(db: { query: PoolClient['query'] }, id: string) {
  const res = await db.query<Row>(`${SELECT_JOINED} WHERE r.id = $1`, [id]);
  if (!res.rows[0]) throw new NotFoundError('Recurring');
  return map(res.rows[0]);
}

export async function list(userId: string) {
  const res = await userQuery<Row>(
    userId,
    `${SELECT_JOINED}
     ORDER BY r.is_active DESC, r.next_due_date ASC`,
    [],
  );
  return res.rows.map(map);
}

export async function getById(userId: string, id: string) {
  return withUserContext(userId, (db) => getByIdOnClient(db, id));
}

export async function create(userId: string, input: CreateRecurringInput) {
  return withUserContext(userId, async (db) => {
    await db.query(`SELECT 1 FROM accounts WHERE id = $1 AND deleted_at IS NULL`, [input.accountId])
      .then(r => { if (r.rowCount === 0) throw new NotFoundError('Account'); });
    if (input.categoryId) {
      await db.query(`SELECT 1 FROM categories WHERE id = $1`, [input.categoryId])
        .then(r => { if (r.rowCount === 0) throw new NotFoundError('Category'); });
    }
    const res = await db.query<Row>(
      `INSERT INTO recurring_transactions
       (user_id, account_id, category_id, amount, currency, type, description, merchant,
        frequency, start_date, end_date, next_due_date, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [userId, input.accountId, input.categoryId ?? null, input.amount, input.currency,
       input.type, input.description ?? null, input.merchant ?? null,
       input.frequency, input.startDate, input.endDate ?? null,
       input.startDate, // next_due starts at start_date
       input.isActive],
    );
    return getByIdOnClient(db, res.rows[0].id);
  });
}

export async function update(userId: string, id: string, input: UpdateRecurringInput) {
  return withUserContext(userId, async (db) => {
    const check = await db.query(`SELECT 1 FROM recurring_transactions WHERE id = $1`, [id]);
    if (check.rowCount === 0) throw new NotFoundError('Recurring');
    const { setClause, values, nextParam } = buildPartialUpdate({
      account_id: input.accountId,
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      type: input.type,
      description: input.description,
      merchant: input.merchant,
      frequency: input.frequency,
      start_date: input.startDate,
      end_date: input.endDate,
      is_active: input.isActive,
    });
    if (!setClause) return getByIdOnClient(db, id);
    await db.query(`UPDATE recurring_transactions SET ${setClause} WHERE id = $${nextParam}`, [...values, id]);
    return getByIdOnClient(db, id);
  });
}

export async function remove(userId: string, id: string) {
  const res = await userQuery(
    userId,
    `DELETE FROM recurring_transactions WHERE id = $1 RETURNING id`,
    [id],
  );
  if (res.rowCount === 0) throw new NotFoundError('Recurring');
}

// Apply due rows for a single user. Caller scope: either the user themselves
// (manual "Apply now" button) or the global scheduler iterating over user ids.
export async function applyDueForUser(userId: string): Promise<{ created: number; rows: string[] }> {
  return withUserContext(userId, async (db) => {
    const today = new Date();
    const todayStr = toIsoDate(today);
    // Pick all active recurrings whose next_due is <= today and whose end_date
    // (if set) hasn't passed. For each, materialize ONE transaction and bump
    // next_due. The scheduler runs hourly so a single late row gets one tx.
    const due = await db.query<Row>(
      `SELECT * FROM recurring_transactions
       WHERE is_active = TRUE AND next_due_date <= $1
         AND (end_date IS NULL OR end_date >= next_due_date)`,
      [todayStr],
    );
    const created: string[] = [];
    for (const r of due.rows) {
      const txRes = await db.query<{ id: string }>(
        `INSERT INTO transactions
         (user_id, account_id, category_id, amount, currency, type,
          description, merchant, date, recurring_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [userId, r.account_id, r.category_id, r.amount, r.currency, r.type,
         r.description, r.merchant, r.next_due_date, r.id],
      );
      const nextDue = toIsoDate(bumpDate(new Date(r.next_due_date), r.frequency));
      // If we just pushed past end_date, deactivate.
      const shouldDeactivate = r.end_date != null && new Date(nextDue) > new Date(r.end_date);
      await db.query(
        `UPDATE recurring_transactions
         SET next_due_date = $1, last_applied_at = NOW(), is_active = $2
         WHERE id = $3`,
        [nextDue, !shouldDeactivate, r.id],
      );
      created.push(txRes.rows[0].id);
    }
    return { created: created.length, rows: created };
  });
}

// Scheduler-side: walk through every user that has at least one due row.
// Runs from a privileged pool query (no RLS context) just to enumerate ids;
// each per-user apply then runs under the proper RLS session.
export async function applyDueAllUsers(): Promise<{ users: number; created: number }> {
  const todayStr = toIsoDate(new Date());
  const res = await pool.query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM recurring_transactions
     WHERE is_active = TRUE AND next_due_date <= $1
       AND (end_date IS NULL OR end_date >= next_due_date)`,
    [todayStr],
  );
  let totalCreated = 0;
  for (const row of res.rows) {
    try {
      const out = await applyDueForUser(row.user_id);
      totalCreated += out.created;
    } catch (e) {
      // Don't let one user's failure abort the whole sweep.
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[recurring] applyDue failed for user ${row.user_id}: ${msg}`);
    }
  }
  return { users: res.rows.length, created: totalCreated };
}
