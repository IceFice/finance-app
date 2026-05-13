import { differenceInDays, parseISO, startOfMonth, startOfWeek, startOfYear } from 'date-fns';

export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';

/** Start of period that applies to a given budget period enum */
export function periodStartDate(period: BudgetPeriod, now = new Date()): Date {
  switch (period) {
    case 'monthly': return startOfMonth(now);
    case 'weekly':  return startOfWeek(now, { weekStartsOn: 1 });
    case 'yearly':  return startOfYear(now);
  }
}

/** Percentage of budget spent (0-based, may exceed 100 when over budget) */
export function calcSpentPercentage(spent: string, limit: string): number {
  const l = parseFloat(limit);
  if (l <= 0) return 0;
  return Math.round((parseFloat(spent) / l) * 1000) / 10; // one decimal place
}

/** Whether spend has exceeded the budget limit */
export function isOverBudget(spent: string, limit: string): boolean {
  return parseFloat(spent) > parseFloat(limit);
}

/** Remaining budget amount (negative when over budget) */
export function calcRemaining(spent: string, limit: string): string {
  return (parseFloat(limit) - parseFloat(spent)).toFixed(2);
}

/** Days remaining in budget period.
 *  Returns null when the budget has no end_date and uses a rolling period. */
export function calcDaysRemaining(endDate: string | null, period: BudgetPeriod, now = new Date()): number | null {
  if (endDate) {
    const end = parseISO(endDate);
    return Math.max(0, differenceInDays(end, now));
  }
  // Rolling period: compute end as start of *next* period
  switch (period) {
    case 'monthly': {
      const end = startOfMonth(new Date(now.getFullYear(), now.getMonth() + 1));
      return Math.max(0, differenceInDays(end, now));
    }
    case 'weekly': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = new Date(start.getTime() + 7 * 86_400_000);
      return Math.max(0, differenceInDays(end, now));
    }
    case 'yearly': {
      const end = startOfYear(new Date(now.getFullYear() + 1, 0));
      return Math.max(0, differenceInDays(end, now));
    }
  }
}

/** Linear projection of total spend by end of period.
 *  Formula: (spent / daysElapsed) * totalDays */
export function calcProjectedSpend(spent: string, daysElapsed: number, totalDays: number): string {
  if (daysElapsed <= 0 || totalDays <= 0) return '0.00';
  const daily = parseFloat(spent) / daysElapsed;
  return (daily * totalDays).toFixed(2);
}

/** Complete budget progress object for API responses */
export function calcBudgetProgress(opts: {
  spent: string;
  limit: string;
  period: BudgetPeriod;
  endDate: string | null;
  now?: Date;
}) {
  const { spent, limit, period, endDate, now = new Date() } = opts;
  const start = periodStartDate(period, now);
  const daysElapsed = Math.max(1, differenceInDays(now, start));
  const daysRemaining = calcDaysRemaining(endDate, period, now);
  const totalDays = daysRemaining !== null ? daysElapsed + daysRemaining : null;

  return {
    spent,
    limit,
    remaining: calcRemaining(spent, limit),
    pct: calcSpentPercentage(spent, limit),
    isOverBudget: isOverBudget(spent, limit),
    daysRemaining,
    projectedSpend: totalDays !== null ? calcProjectedSpend(spent, daysElapsed, totalDays) : null,
  };
}
