/** Reduce monthly rows into overall totals.
 *  Keeps arithmetic in string domain (via parseFloat → toFixed) to match
 *  the way PostgreSQL returns NUMERIC values as text. */
export function sumMonthlyTotals(rows: { income: string; expenses: string; net: string }[]) {
  return rows.reduce(
    (acc, r) => ({
      income:   (parseFloat(acc.income)   + parseFloat(r.income)).toFixed(2),
      expenses: (parseFloat(acc.expenses) + parseFloat(r.expenses)).toFixed(2),
      net:      (parseFloat(acc.net)      + parseFloat(r.net)).toFixed(2),
    }),
    { income: '0.00', expenses: '0.00', net: '0.00' }
  );
}

/** Calculate percentage share of each category from a grand total string. */
export function calcCategoryPct(total: string, grandTotal: number): string {
  if (grandTotal <= 0) return '0.0';
  return ((parseFloat(total) / grandTotal) * 100).toFixed(1);
}
