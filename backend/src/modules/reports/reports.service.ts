import { userQuery } from '../../db/context';
import { sumMonthlyTotals, calcCategoryPct } from './reports.math';

export async function monthlySummary(userId: string, from: string, to: string) {
  const res = await userQuery<{
    month: string; income: string; expenses: string; net: string; tx_count: string;
  }>(
    userId,
    `SELECT
       date_trunc('month', date)::DATE::TEXT AS month,
       COALESCE(SUM(amount_base) FILTER (WHERE type = 'credit'), 0)::NUMERIC(15,2)::TEXT AS income,
       COALESCE(SUM(ABS(amount_base)) FILTER (WHERE type = 'debit'), 0)::NUMERIC(15,2)::TEXT AS expenses,
       COALESCE(SUM(amount_base) FILTER (WHERE type = 'credit') -
                SUM(ABS(amount_base)) FILTER (WHERE type = 'debit'), 0)::NUMERIC(15,2)::TEXT AS net,
       COUNT(*)::TEXT AS tx_count
     FROM transactions
     WHERE user_id = $1 AND date BETWEEN $2 AND $3
       AND deleted_at IS NULL AND transfer_pair_id IS NULL
     GROUP BY date_trunc('month', date)
     ORDER BY month ASC`,
    [userId, from, to]
  );

  // Return the rows array directly so callers can Array.isArray() check it.
  // Also expose totals as a separate field for dashboard use.
  const rows = res.rows;
  const totals = sumMonthlyTotals(rows);
  return Object.assign(rows, { totals });
}

export async function spendingByCategory(userId: string, from: string, to: string) {
  const res = await userQuery<{
    category_id: string; category_name: string; category_color: string | null;
    category_type: string; total: string; tx_count: string;
  }>(
    userId,
    `SELECT
       c.id AS category_id, c.name AS category_name,
       c.color AS category_color, c.type AS category_type,
       COALESCE(SUM(ABS(t.amount_base)), 0)::NUMERIC(15,2)::TEXT AS total,
       COUNT(t.id)::TEXT AS tx_count
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.date BETWEEN $2 AND $3
       AND t.deleted_at IS NULL AND t.transfer_pair_id IS NULL
     GROUP BY c.id, c.name, c.color, c.type
     ORDER BY total DESC`,
    [userId, from, to]
  );

  const grandTotal = res.rows.reduce((s, r) => s + parseFloat(r.total), 0);

  // Return an array so tests can use Array.isArray(). Each item has `percentage`
  // (not `pct`) to match test expectations.
  const rows = res.rows.map(r => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryColor: r.category_color,
    categoryType: r.category_type,
    total: r.total,
    txCount: r.tx_count,
    percentage: calcCategoryPct(r.total, grandTotal),
  }));

  return Object.assign(rows, { grandTotal: grandTotal.toFixed(2) });
}

export async function cashFlow(userId: string, from: string, to: string, granularity: 'day' | 'week' | 'month' = 'month') {
  // Use generate_series so every period in the range is returned even if there
  // are no transactions — R-09 expects exactly 12 rows for a full-year monthly query.
  const interval = granularity === 'day' ? '1 day' : granularity === 'week' ? '1 week' : '1 month';
  const res = await userQuery<{ period: string; income: string; expenses: string; net: string }>(
    userId,
    `WITH periods AS (
       SELECT date_trunc($4, gs)::DATE AS period
       FROM generate_series(
         date_trunc($4, $2::DATE),
         date_trunc($4, $3::DATE),
         $5::INTERVAL
       ) gs
     )
     SELECT
       p.period::TEXT,
       COALESCE(SUM(t.amount_base) FILTER (WHERE t.type = 'credit'), 0)::NUMERIC(15,2)::TEXT AS income,
       COALESCE(SUM(ABS(t.amount_base)) FILTER (WHERE t.type = 'debit'), 0)::NUMERIC(15,2)::TEXT AS expenses,
       COALESCE(
         SUM(t.amount_base) FILTER (WHERE t.type = 'credit') -
         SUM(ABS(t.amount_base)) FILTER (WHERE t.type = 'debit'),
         0
       )::NUMERIC(15,2)::TEXT AS net
     FROM periods p
     LEFT JOIN transactions t ON date_trunc($4, t.date) = p.period
       AND t.user_id = $1 AND t.deleted_at IS NULL AND t.transfer_pair_id IS NULL
     GROUP BY p.period
     ORDER BY p.period ASC`,
    [userId, from, to, granularity, interval]
  );

  // Return the rows array directly so callers can check length.
  return Object.assign(res.rows, { granularity });
}

