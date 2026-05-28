// CSV export for transactions. Client-side: walks the paginated /transactions
// endpoint until exhausted, builds a CSV blob, triggers a download.
//
// Why client-side: no backend changes needed, and the typical export size
// (≤ a few thousand rows for a personal finance user over a year) fits in
// memory easily. The bounded loop protects against runaway pagination.

import api from '@/lib/api';

interface Tx {
  id: string;
  date: string;
  type: string;
  amount: string;
  currency: string;
  merchant: string | null;
  description: string | null;
  notes: string | null;
  categoryName: string | null;
  accountName: string | null;
}

interface Page {
  data: Tx[];
  pagination: { nextCursor: string | null; hasMore: boolean; limit: number };
}

// Excel-friendly CSV escaping: wrap in quotes when value contains
// comma/quote/newline; double-up internal quotes.
function escape(v: string | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export interface ExportFilters {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
  search?: string;
}

export async function exportTransactionsCsv(filters: ExportFilters = {}): Promise<{ count: number }> {
  const rows: Tx[] = [];
  let cursor: string | null = null;
  // Bound the loop — protects against a misbehaving API returning hasMore
  // forever. 1000 pages * 100/page = 100k transactions, plenty.
  for (let i = 0; i < 1000; i++) {
    const params = new URLSearchParams({ limit: '100' });
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.accountId) params.set('accountId', filters.accountId);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.type) params.set('type', filters.type);
    if (filters.search) params.set('search', filters.search);
    if (cursor) params.set('cursor', cursor);
    const page = (await api.get<{ data: Tx[]; pagination: Page['pagination'] }>(`/transactions?${params}`)).data;
    rows.push(...page.data);
    if (!page.pagination.hasMore) break;
    cursor = page.pagination.nextCursor;
  }

  // Header in Russian so Excel / Numbers show usable column names.
  const header = ['Дата', 'Тип', 'Сумма', 'Валюта', 'Получатель', 'Описание', 'Категория', 'Счёт', 'Заметка'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const typeRu = r.type === 'credit' ? 'Доход' : r.type === 'debit' ? 'Расход' : 'Перевод';
    lines.push([
      escape(r.date),
      escape(typeRu),
      escape(r.amount),
      escape(r.currency),
      escape(r.merchant),
      escape(r.description),
      escape(r.categoryName),
      escape(r.accountName),
      escape(r.notes),
    ].join(','));
  }
  // BOM up front so Excel-Windows recognises UTF-8 (Cyrillic) on open.
  const csv = '﻿' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `babkoschet-operations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { count: rows.length };
}
