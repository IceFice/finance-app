import { describe, it, expect } from 'vitest';
import { sumMonthlyTotals, calcCategoryPct } from '../reports.math';

describe('sumMonthlyTotals', () => {
  it('returns zeros for empty input', () => {
    expect(sumMonthlyTotals([])).toEqual({ income: '0.00', expenses: '0.00', net: '0.00' });
  });

  it('sums a single month correctly', () => {
    const rows = [{ income: '1500.00', expenses: '800.00', net: '700.00' }];
    expect(sumMonthlyTotals(rows)).toEqual({ income: '1500.00', expenses: '800.00', net: '700.00' });
  });

  it('sums multiple months', () => {
    const rows = [
      { income: '2000.00', expenses: '1200.00', net:  '800.00' },
      { income: '1800.00', expenses:  '900.00', net:  '900.00' },
      { income: '2500.00', expenses: '2000.00', net:  '500.00' },
    ];
    const result = sumMonthlyTotals(rows);
    expect(result.income).toBe('6300.00');
    expect(result.expenses).toBe('4100.00');
    expect(result.net).toBe('2200.00');
  });

  it('handles negative net correctly (more expenses than income)', () => {
    const rows = [
      { income: '500.00', expenses: '1500.00', net: '-1000.00' },
      { income: '600.00', expenses:  '400.00', net:   '200.00' },
    ];
    const result = sumMonthlyTotals(rows);
    expect(result.net).toBe('-800.00');
  });

  it('preserves two decimal places with floating-point values', () => {
    const rows = [
      { income: '333.33', expenses: '111.11', net: '222.22' },
      { income: '333.33', expenses: '111.11', net: '222.22' },
      { income: '333.34', expenses: '111.11', net: '222.23' },
    ];
    const result = sumMonthlyTotals(rows);
    expect(result.income).toBe('1000.00');
    expect(result.expenses).toBe('333.33');
    expect(result.net).toBe('666.67');
  });

  it('does not mutate the input array', () => {
    const rows = [{ income: '100.00', expenses: '50.00', net: '50.00' }];
    const original = JSON.stringify(rows);
    sumMonthlyTotals(rows);
    expect(JSON.stringify(rows)).toBe(original);
  });
});

describe('calcCategoryPct', () => {
  it('returns 0.0 when grandTotal is 0', () => {
    expect(calcCategoryPct('500.00', 0)).toBe('0.0');
  });

  it('returns 0.0 when grandTotal is negative', () => {
    expect(calcCategoryPct('100.00', -200)).toBe('0.0');
  });

  it('returns 100.0 when total equals grandTotal', () => {
    expect(calcCategoryPct('500.00', 500)).toBe('100.0');
  });

  it('returns correct percentage for a third share', () => {
    // 100 / 300 = 33.3%
    expect(calcCategoryPct('100.00', 300)).toBe('33.3');
  });

  it('returns one decimal place', () => {
    // 1 / 7 ≈ 14.285... → 14.3%
    expect(calcCategoryPct('1.00', 7)).toBe('14.3');
  });

  it('handles string totals with cents', () => {
    expect(calcCategoryPct('250.50', 1000)).toBe('25.1');
  });
});
