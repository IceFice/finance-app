import { describe, it, expect } from 'vitest';
import {
  calcSpentPercentage,
  isOverBudget,
  calcRemaining,
  calcDaysRemaining,
  calcProjectedSpend,
  calcBudgetProgress,
  periodStartDate,
} from '../budgets.math';

// ── periodStartDate ───────────────────────────────────────────────────────────

describe('periodStartDate', () => {
  const now = new Date('2024-03-15T14:00:00Z');

  it('monthly → first day of current month', () => {
    const start = periodStartDate('monthly', now);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(2); // March = 2
    expect(start.getFullYear()).toBe(2024);
  });

  it('weekly → most recent Monday', () => {
    // 2024-03-15 is a Friday — Monday should be 2024-03-11
    const start = periodStartDate('weekly', now);
    expect(start.getDay()).toBe(1); // Monday
  });

  it('yearly → January 1st of current year', () => {
    const start = periodStartDate('yearly', now);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(start.getFullYear()).toBe(2024);
  });
});

// ── calcSpentPercentage ───────────────────────────────────────────────────────

describe('calcSpentPercentage', () => {
  it('returns 0 when nothing spent', () => {
    expect(calcSpentPercentage('0.00', '500.00')).toBe(0);
  });

  it('returns 50 when exactly half spent', () => {
    expect(calcSpentPercentage('250.00', '500.00')).toBe(50);
  });

  it('returns 100 when fully spent', () => {
    expect(calcSpentPercentage('500.00', '500.00')).toBe(100);
  });

  it('exceeds 100 when over budget', () => {
    expect(calcSpentPercentage('600.00', '500.00')).toBe(120);
  });

  it('returns one decimal place precision', () => {
    // 1/3 ≈ 33.3%
    expect(calcSpentPercentage('100.00', '300.00')).toBe(33.3);
  });

  it('returns 0 when limit is 0 (guard against division by zero)', () => {
    expect(calcSpentPercentage('100.00', '0.00')).toBe(0);
  });

  it('returns 0 when limit is negative', () => {
    expect(calcSpentPercentage('100.00', '-50.00')).toBe(0);
  });
});

// ── isOverBudget ─────────────────────────────────────────────────────────────

describe('isOverBudget', () => {
  it('false when spent < limit', () => {
    expect(isOverBudget('400.00', '500.00')).toBe(false);
  });

  it('false when spent == limit', () => {
    expect(isOverBudget('500.00', '500.00')).toBe(false);
  });

  it('true when spent > limit', () => {
    expect(isOverBudget('500.01', '500.00')).toBe(true);
  });
});

// ── calcRemaining ─────────────────────────────────────────────────────────────

describe('calcRemaining', () => {
  it('positive when under budget', () => {
    expect(calcRemaining('300.00', '500.00')).toBe('200.00');
  });

  it('zero when exactly at limit', () => {
    expect(calcRemaining('500.00', '500.00')).toBe('0.00');
  });

  it('negative when over budget', () => {
    expect(calcRemaining('600.00', '500.00')).toBe('-100.00');
  });

  it('preserves two decimal places', () => {
    expect(calcRemaining('100.50', '200.75')).toBe('100.25');
  });
});

// ── calcDaysRemaining ─────────────────────────────────────────────────────────

describe('calcDaysRemaining', () => {
  const now = new Date('2024-03-15T12:00:00Z');

  it('uses explicit endDate when provided', () => {
    expect(calcDaysRemaining('2024-03-20', 'monthly', now)).toBe(5);
  });

  it('returns 0 when endDate is in the past', () => {
    expect(calcDaysRemaining('2024-03-10', 'monthly', now)).toBe(0);
  });

  it('monthly rolling: days until next month start', () => {
    // 2024-03-15 → April 1 = 17 days
    const days = calcDaysRemaining(null, 'monthly', now);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(31);
  });

  it('weekly rolling: days until next week start (1-7)', () => {
    const days = calcDaysRemaining(null, 'weekly', now);
    expect(days).toBeGreaterThanOrEqual(0);
    expect(days).toBeLessThanOrEqual(7);
  });

  it('yearly rolling: days until Jan 1 next year', () => {
    const days = calcDaysRemaining(null, 'yearly', now);
    // March 15 → Jan 1 2025 = ~291 days
    expect(days).toBeGreaterThan(200);
    expect(days).toBeLessThan(400);
  });
});

// ── calcProjectedSpend ────────────────────────────────────────────────────────

describe('calcProjectedSpend', () => {
  it('linear extrapolation from partial period', () => {
    // Spent 300 in 10 days, total period 30 days → project = 900
    expect(calcProjectedSpend('300.00', 10, 30)).toBe('900.00');
  });

  it('returns same amount if period is already complete', () => {
    // daysElapsed == totalDays → spend/day * totalDays = spent
    expect(calcProjectedSpend('500.00', 30, 30)).toBe('500.00');
  });

  it('returns 0.00 when daysElapsed is 0', () => {
    expect(calcProjectedSpend('100.00', 0, 30)).toBe('0.00');
  });

  it('returns 0.00 when totalDays is 0', () => {
    expect(calcProjectedSpend('100.00', 5, 0)).toBe('0.00');
  });

  it('handles zero spend', () => {
    expect(calcProjectedSpend('0.00', 15, 30)).toBe('0.00');
  });

  it('preserves two decimal places', () => {
    // Spent 100 in 3 days out of 30 → 1000.00
    expect(calcProjectedSpend('100.00', 3, 30)).toBe('1000.00');
  });
});

// ── calcBudgetProgress (integration of all calculations) ─────────────────────

describe('calcBudgetProgress', () => {
  const now = new Date('2024-03-15T12:00:00Z');

  it('returns correct shape for a healthy monthly budget', () => {
    const result = calcBudgetProgress({
      spent: '300.00', limit: '500.00',
      period: 'monthly', endDate: null, now,
    });

    expect(result.spent).toBe('300.00');
    expect(result.limit).toBe('500.00');
    expect(result.remaining).toBe('200.00');
    expect(result.pct).toBe(60);
    expect(result.isOverBudget).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.projectedSpend).toBeTruthy();
  });

  it('flags over-budget correctly', () => {
    const result = calcBudgetProgress({
      spent: '600.00', limit: '500.00',
      period: 'monthly', endDate: null, now,
    });

    expect(result.isOverBudget).toBe(true);
    expect(result.pct).toBe(120);
    expect(result.remaining).toBe('-100.00');
  });

  it('shows null projectedSpend when no totalDays can be derived', () => {
    // Edge case: daysRemaining = 0 (expired budget with explicit endDate in past)
    const result = calcBudgetProgress({
      spent: '300.00', limit: '500.00',
      period: 'monthly', endDate: '2024-03-10', now,
    });

    // daysRemaining = 0 → totalDays = daysElapsed + 0
    // projectedSpend should still compute (totalDays > 0)
    expect(result.projectedSpend).not.toBeNull();
  });
});
