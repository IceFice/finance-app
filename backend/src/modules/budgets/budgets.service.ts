import { userQuery, withUserContext } from '../../db/context';
import { NotFoundError } from '../../lib/errors';
import type { CreateBudgetInput, UpdateBudgetInput } from './budgets.schema';

interface BudgetRow {
  id: string; user_id: string; category_id: string | null; name: string;
  amount: string; currency: string; period: string;
  start_date: string; end_date: string | null; is_active: boolean;
  created_at: Date; updated_at: Date;
}

function mapBudget(row: BudgetRow & { spent?: string; category_name?: string; category_color?: string }) {
  return {
    id: row.id, categoryId: row.category_id, name: row.name,
    amount: row.amount, currency: row.currency, period: row.period,
    startDate: row.start_date, endDate: row.end_date, isActive: row.is_active,
    createdAt: row.created_at, updatedAt: row.updated_at,
    spent: row.spent ?? '0.00',
    categoryName: row.category_name ?? null,
    categoryColor: row.category_color ?? null,
  };
}

export async function getById(userId: string, budgetId: string) {
  const res = await userQuery<BudgetRow>(
    userId,
    `SELECT * FROM budgets WHERE id = $1 AND user_id = $2 AND is_active = true`,
    [budgetId, userId]
  );
  if (!res.rows[0]) throw new NotFoundError('Budget');
  return mapBudget(res.rows[0]);
}

export async function list(userId: string) {
  const res = await userQuery<BudgetRow & { spent: string; category_name: string; category_color: string }>(
    userId,
    `SELECT b.*, c.name AS category_name, c.color AS category_color,
      COALESCE(SUM(ABS(t.amount_base)), 0)::NUMERIC(15,2)::TEXT AS spent
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     LEFT JOIN transactions t ON
       -- A budget with no category tracks ALL spending in the period;
       -- a category budget tracks only that category.
       (b.category_id IS NULL OR t.category_id = b.category_id)
       AND t.user_id = b.user_id
       AND t.type = 'debit'
       AND t.deleted_at IS NULL
       AND t.date >= CASE b.period
         WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE)::DATE
         WHEN 'weekly'  THEN date_trunc('week', CURRENT_DATE)::DATE
         WHEN 'yearly'  THEN date_trunc('year', CURRENT_DATE)::DATE
       END
     WHERE b.user_id = $1 AND b.is_active = true
     GROUP BY b.id, c.name, c.color
     ORDER BY b.created_at ASC`,
    [userId]
  );
  return res.rows.map(mapBudget);
}

export async function progress(userId: string) {
  const rows = await list(userId);
  return rows.map((b) => {
    const spentNum = parseFloat(b.spent);
    const amountNum = parseFloat(b.amount);
    const percentage = amountNum > 0 ? ((spentNum / amountNum) * 100).toFixed(2) : '0.00';
    const status = spentNum > amountNum ? 'exceeded' : spentNum >= amountNum * 0.8 ? 'warning' : 'ok';
    return { ...b, percentage, status };
  });
}

export async function create(userId: string, input: CreateBudgetInput) {
  const res = await userQuery<BudgetRow>(
    userId,
    `INSERT INTO budgets (user_id, category_id, name, amount, currency, period, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [userId, input.categoryId ?? null, input.name, input.amount, input.currency, input.period, input.startDate, input.endDate ?? null]
  );
  return mapBudget(res.rows[0]);
}

export async function update(userId: string, budgetId: string, input: UpdateBudgetInput) {
  return withUserContext(userId, async (db) => {
    const check = await db.query<BudgetRow>(`SELECT * FROM budgets WHERE id = $1`, [budgetId]);
    if (!check.rows[0]) throw new NotFoundError('Budget');

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      name: 'name', categoryId: 'category_id', amount: 'amount',
      currency: 'currency', period: 'period', startDate: 'start_date', endDate: 'end_date',
    };
    for (const [key, col] of Object.entries(map)) {
      if ((input as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push((input as Record<string, unknown>)[key]);
      }
    }
    if (fields.length === 0) return mapBudget(check.rows[0]);
    values.push(budgetId);
    const res = await db.query<BudgetRow>(
      `UPDATE budgets SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values
    );
    return mapBudget(res.rows[0]);
  });
}

export async function remove(userId: string, budgetId: string) {
  return withUserContext(userId, async (db) => {
    const res = await db.query(
      `UPDATE budgets SET is_active = false WHERE id = $1 AND is_active = true RETURNING id`,
      [budgetId]
    );
    if (res.rowCount === 0) throw new NotFoundError('Budget');
  });
}
