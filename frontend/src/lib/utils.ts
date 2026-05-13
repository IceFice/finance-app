import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: string | number, currency = 'USD'): string {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string, fmt = 'd MMM yyyy'): string {
  try { return format(parseISO(date), fmt, { locale: ru }); }
  catch { return date; }
}

export function formatShortDate(date: string): string {
  return formatDate(date, 'd MMM');
}
