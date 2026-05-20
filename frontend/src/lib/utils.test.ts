import { describe, it, expect } from 'vitest';
import { sumMoney, formatMoney } from './utils';

describe('sumMoney', () => {
  it('sums without floating-point drift', () => {
    // 0.1 + 0.2 !== 0.3 in IEEE754; cent-rounding must fix it.
    expect(sumMoney(['0.10', '0.20'])).toBe('0.30');
  });

  it('handles many rows and mixed sign', () => {
    expect(sumMoney(['1250.00', '-30.50', '0.01', 100])).toBe('1319.51');
  });

  it('treats non-numeric / empty as 0', () => {
    expect(sumMoney(['abc', '', '5.00'])).toBe('5.00');
  });

  it('returns 0.00 for empty input', () => {
    expect(sumMoney([])).toBe('0.00');
  });
});

describe('formatMoney', () => {
  it('formats RUB without kopecks by default (banking convention)', () => {
    expect(formatMoney('1250.5', 'RUB')).toMatch(/1\s?251\s?₽/);
  });

  it('keeps 2 decimals for USD/EUR by default', () => {
    expect(formatMoney('1250.5', 'USD')).toMatch(/1\s?250,50/);
    expect(formatMoney('1250.5', 'EUR')).toMatch(/1\s?250,50/);
  });

  it('honours the explicit fractionDigits override', () => {
    expect(formatMoney('1250', 'RUB', 2)).toMatch(/1\s?250,00/);
  });

  it('falls back to 0 for NaN instead of printing "NaN"', () => {
    const out = formatMoney('not-a-number', 'RUB');
    expect(out).not.toMatch(/NaN/i);
    expect(out).toMatch(/^0\s?₽/);
  });
});
