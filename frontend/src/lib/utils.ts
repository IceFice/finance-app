import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Per-currency default fraction digits. RUB conventionally without kopecks
// in UI; foreign currencies keep 2 decimals. Pass `fractionDigits` to override.
const DEFAULT_FRACTION: Record<string, number> = { RUB: 0, USD: 2, EUR: 2 };

export function formatMoney(
  amount: string | number,
  currency = 'RUB',
  fractionDigits?: number
): string {
  const raw = typeof amount === 'string' ? Number(amount) : amount;
  const num = Number.isFinite(raw) ? raw : 0;
  const f = fractionDigits ?? DEFAULT_FRACTION[currency] ?? 2;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency,
    minimumFractionDigits: f, maximumFractionDigits: f,
  }).format(num);
}

/**
 * Sum money values exactly. Each value is rounded to integer minor units
 * (cents) BEFORE summing, so floating-point error can't accumulate across
 * many rows. Returns a "0.00"-style string.
 */
export function sumMoney(values: ReadonlyArray<string | number>): string {
  const cents = values.reduce<number>((acc, v) => {
    const n = Number(v);
    return acc + (Number.isFinite(n) ? Math.round(n * 100) : 0);
  }, 0);
  return (cents / 100).toFixed(2);
}

export function formatDate(date: string, fmt = 'd MMM yyyy'): string {
  try { return format(parseISO(date), fmt, { locale: ru }); }
  catch { return date; }
}

export function formatShortDate(date: string): string {
  return formatDate(date, 'd MMM');
}

// ── Presentational helpers (were duplicated across pages) ────────────────────

/** First grapheme of a label, uppercased — used for avatar / initial chips. */
export function initialOf(s: string | null | undefined): string {
  return (s || '?').trim().slice(0, 1).toUpperCase();
}

/** Compact money: 1 234 → "1.2K", 1 200 000 → "1.2M". RUB ₽ suffix,
 *  $/€ prefix for foreign. Used where space is tight (cards, chips). */
export function compactMoney(amount: string | number, currency = 'RUB'): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const v = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  let s: string;
  if (abs >= 1_000_000) s = (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  else if (abs >= 1_000) s = (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  else s = String(Math.round(v));
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
  return currency === 'RUB' ? `${s} ${sym}` : `${sym}${s}`;
}
