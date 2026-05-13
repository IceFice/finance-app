import { pool } from '../../db/pool';
import { sumMonthlyTotals, calcCategoryPct } from './reports.math';

export async function monthlySummary(userId: string, from: string, to: string) {
  const res = await pool.query<{
    month: string; income: string; expenses: string; net: string; tx_count: string;
  }>(
    `SELECT
       date_trunc('month', date)::DATE::TEXT AS month,
       COALESCE(SUM(amount_base) FILTER (WHERE type = 'credit'), 0)::TEXT AS income,
       COALESCE(SUM(ABS(amount_base)) FILTER (WHERE type = 'debit'), 0)::TEXT AS expenses,
       COALESCE(SUM(amount_base) FILTER (WHERE type = 'credit') -
                SUM(ABS(amount_base)) FILTER (WHERE type = 'debit'), 0)::TEXT AS net,
       COUNT(*)::TEXT AS tx_count
     FROM transactions
     WHERE user_id = $1 AND date BETWEEN $2 AND $3
       AND deleted_at IS NULL AND type != 'transfer'
     GROUP BY date_trunc('month', date)
     ORDER BY month ASC`,
    [userId, from, to]
  );

  const totals = sumMonthlyTotals(res.rows);

  return { months: res.rows, totals };
}

export async function spendingByCategory(userId: string, from: string, to: string) {
  const res = await pool.query<{
    category_id: string; category_name: string; category_color: string | null;
    category_type: string; total: string; tx_count: string;
  }>(
    `SELECT
       c.id AS category_id, c.name AS category_name,
       c.color AS category_color, c.type AS category_type,
       COALESCE(SUM(ABS(t.amount_base)), 0)::TEXT AS total,
       COUNT(t.id)::TEXT AS tx_count
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.date BETWEEN $2 AND $3
       AND t.deleted_at IS NULL AND t.type != 'transfer'
     GROUP BY c.id, c.name, c.color, c.type
     ORDER BY total DESC`,
    [userId, from, to]
  );

  const grandTotal = res.rows.reduce((s, r) => s + parseFloat(r.total), 0);

  return {
    categories: res.rows.map(r => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      categoryColor: r.category_color,
      categoryType: r.category_type,
      total: r.total,
      txCount: r.tx_count,
      pct: calcCategoryPct(r.total, grandTotal),
    })),
    grandTotal: grandTotal.toFixed(2),
  };
}

export async function cashFlow(userId: string, from: string, to: string, granularity: 'day' | 'week' | 'month' = 'month') {
  const res = await pool.query<{ period: string; income: string; expenses: string; net: string }>(
    `SELECT
       date_trunc($4, date)::DATE::TEXT AS period,
       COALESCE(SUM(amount_base) FILTER (WHERE type = 'credit'), 0)::TEXT AS income,
       COALESCE(SUM(ABS(amount_base)) FILTER (WHERE type = 'debit'), 0)::TEXT AS expenses,
       COALESCE(SUM(amount_base) FILTER (WHERE type = 'credit') -
                SUM(ABS(amount_base)) FILTER (WHERE type = 'debit'), 0)::TEXT AS net
     FROM transactions
     WHERE user_id = $1 AND date BETWEEN $2 AND $3
       AND deleted_at IS NULL AND type != 'transfer'
     GROUP BY date_trunc($4, date)
     ORDER BY period ASC`,
    [userId, from, to, granularity]
  );
  return { points: res.rows, granularity };
}

export async function budgetVsActual(userId: string, from: string, to: string) {
  const res = await pool.query<{
    budget_id: string; budget_name: string; category_id: string | null;
    category_name: string | null; category_color: string | null;
    budget: string; actual: string;
  }>(
    `SELECT
       b.id AS budget_id, b.name AS budget_name,
       b.category_id, c.name AS category_name, c.color AS category_color,
       b.amount::TEXT AS budget,
       COALESCE(SUM(ABS(t.amount_base)), 0)::TEXT AS actual
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     LEFT JOIN transactions t ON t.category_id = b.category_id
       AND t.user_id = b.user_id AND t.type = 'debit'
       AND t.deleted_at IS NULL AND t.date BETWEEN $2 AND $3
     WHERE b.user_id = $1 AND b.is_active = true
     GROUP BY b.id, b.name, b.category_id, c.name, c.color, b.amount
     ORDER BY b.name ASC`,
    [userId, from, to]
  );
  return { categories: res.rows };
}
