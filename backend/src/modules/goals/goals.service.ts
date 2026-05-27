import type { PoolClient } from 'pg';
import { userQuery, withUserContext } from '../../db/context';
import { NotFoundError } from '../../lib/errors';
import type { CreateGoalInput, UpdateGoalInput } from './goals.schema';

interface GoalRow {
  id: string; user_id: string; name: string;
  target_amount: string; current_amount: string; currency: string;
  deadline: string | null; source_account_id: string | null;
  color: string | null; icon: string | null;
  is_active: boolean; created_at: Date; updated_at: Date;
  source_balance?: string | null;
}

function map(row: GoalRow) {
  // current = source account's live balance when linked, else manual field.
  const effective = row.source_balance != null && row.source_account_id != null
    ? row.source_balance
    : row.current_amount;
  const target = Number(row.target_amount);
  const current = Number(effective);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);
  const today = new Date();
  const deadlineDate = row.deadline ? new Date(row.deadline) : null;
  const daysLeft = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - today.getTime()) / 86_400_000))
    : null;
  // "On track" — projected to hit the goal by deadline at current pace from
  // creation. Conservative heuristic: required = (target - current) / days_left.
  const onTrack = daysLeft === null || remaining === 0
    ? true
    : remaining / Math.max(1, daysLeft) <= target / Math.max(1, Math.ceil(
        (today.getTime() - row.created_at.getTime()) / 86_400_000,
      ));
  return {
    id: row.id, name: row.name,
    targetAmount: row.target_amount,
    currentAmount: effective,
    manualAmount: row.current_amount,
    currency: row.currency,
    deadline: row.deadline ? String(row.deadline).slice(0, 10) : null,
    sourceAccountId: row.source_account_id,
    color: row.color, icon: row.icon,
    isActive: row.is_active,
    progressPct: Math.round(pct * 10) / 10,
    remaining: remaining.toFixed(2),
    daysLeft, onTrack,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

// LEFT JOIN accounts so we can use the live balance when source_account_id is
// set. RLS on accounts already restricts to caller-owned rows.
const SELECT_WITH_BALANCE = `
  SELECT g.*, a.balance AS source_balance
  FROM savings_goals g
  LEFT JOIN accounts a ON a.id = g.source_account_id AND a.deleted_at IS NULL
`;

export async function list(userId: string) {
  const res = await userQuery<GoalRow>(
    userId,
    `${SELECT_WITH_BALANCE}
     ORDER BY g.is_active DESC, g.created_at DESC`,
    [],
  );
  return res.rows.map(map);
}

// Fetch + map on a caller-supplied client. Used by create()/update() to read
// back the joined shape on the same connection — a fresh pool connection
// wouldn't see the uncommitted INSERT/UPDATE yet and would 404.
async function getByIdOnClient(db: { query: PoolClient['query'] }, id: string) {
  const res = await db.query<GoalRow>(`${SELECT_WITH_BALANCE} WHERE g.id = $1`, [id]);
  if (!res.rows[0]) throw new NotFoundError('Goal');
  return map(res.rows[0]);
}

export async function getById(userId: string, id: string) {
  return withUserContext(userId, (db) => getByIdOnClient(db, id));
}

export async function create(userId: string, input: CreateGoalInput) {
  return withUserContext(userId, async (db) => {
    if (input.sourceAccountId) {
      const a = await db.query(
        `SELECT 1 FROM accounts WHERE id = $1 AND deleted_at IS NULL`,
        [input.sourceAccountId],
      );
      if (a.rowCount === 0) throw new NotFoundError('Account');
    }
    const res = await db.query<{ id: string }>(
      `INSERT INTO savings_goals
       (user_id, name, target_amount, current_amount, currency, deadline,
        source_account_id, color, icon, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [userId, input.name, input.targetAmount, input.currentAmount, input.currency,
       input.deadline ?? null, input.sourceAccountId ?? null,
       input.color ?? null, input.icon ?? null, input.isActive],
    );
    // Re-fetch joined row for source_balance — on the same client so we see
    // the uncommitted INSERT.
    return getByIdOnClient(db, res.rows[0].id);
  });
}

export async function update(userId: string, id: string, input: UpdateGoalInput) {
  return withUserContext(userId, async (db) => {
    const check = await db.query(`SELECT 1 FROM savings_goals WHERE id = $1`, [id]);
    if (check.rowCount === 0) throw new NotFoundError('Goal');
    if (input.sourceAccountId) {
      const a = await db.query(
        `SELECT 1 FROM accounts WHERE id = $1 AND deleted_at IS NULL`,
        [input.sourceAccountId],
      );
      if (a.rowCount === 0) throw new NotFoundError('Account');
    }
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const push = (col: string, v: unknown) => { fields.push(`${col} = $${i++}`); values.push(v); };
    if (input.name !== undefined) push('name', input.name);
    if (input.targetAmount !== undefined) push('target_amount', input.targetAmount);
    if (input.currentAmount !== undefined) push('current_amount', input.currentAmount);
    if (input.currency !== undefined) push('currency', input.currency);
    if (input.deadline !== undefined) push('deadline', input.deadline);
    if (input.sourceAccountId !== undefined) push('source_account_id', input.sourceAccountId);
    if (input.color !== undefined) push('color', input.color);
    if (input.icon !== undefined) push('icon', input.icon);
    if (input.isActive !== undefined) push('is_active', input.isActive);
    if (fields.length === 0) return getByIdOnClient(db, id);
    values.push(id);
    await db.query(`UPDATE savings_goals SET ${fields.join(', ')} WHERE id = $${i}`, values);
    return getByIdOnClient(db, id);
  });
}

export async function remove(userId: string, id: string) {
  const res = await userQuery(
    userId,
    `DELETE FROM savings_goals WHERE id = $1 RETURNING id`,
    [id],
  );
  if (res.rowCount === 0) throw new NotFoundError('Goal');
}
