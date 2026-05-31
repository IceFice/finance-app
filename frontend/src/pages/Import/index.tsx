// ════════════════════════════════════════════════════════════════════════════
// /import — bulk CSV import for transactions
// Flow: drop file → parse → map columns → pick account → preview → submit.
// Backend dedupes by default on (account+date+amount+type+merchant).
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useRef, useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategoriesCrud } from '@/hooks/useCategories';
import { useImportTransactions, ImportRow, ImportResult } from '@/hooks/useTransactions';
import { useToast, extractApiError } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { parseCSV, parseDate, parseAmount } from '@/lib/csv';
import { cn } from '@/lib/utils';

type FieldKey = 'ignore' | 'date' | 'amount' | 'type' | 'merchant' | 'description' | 'notes' | 'category';
const FIELD_LABELS: Record<FieldKey, string> = {
  ignore: '— Пропустить —',
  date: 'Дата',
  amount: 'Сумма',
  type: 'Тип (доход/расход)',
  merchant: 'Получатель',
  description: 'Описание',
  notes: 'Заметка',
  category: 'Категория (имя)',
};

// Guess the right field for a header label.
function guessField(header: string): FieldKey {
  const h = header.toLowerCase().trim();
  if (/(дата|date)/.test(h)) return 'date';
  if (/(сумма|amount|кол-?во|value|price)/.test(h)) return 'amount';
  if (/(тип|type|debit|credit|income|expense|доход|расход)/.test(h)) return 'type';
  if (/(merchant|получатель|магазин|payee|контрагент)/.test(h)) return 'merchant';
  if (/(описание|description|комментарий|comment|memo|назначение)/.test(h)) return 'description';
  if (/(notes|заметк)/.test(h)) return 'notes';
  if (/(категори|category)/.test(h)) return 'category';
  return 'ignore';
}

function inferTypeCell(s: string, negative: boolean): 'debit' | 'credit' {
  const v = s.toLowerCase().trim();
  if (v === 'credit' || v === 'income' || v === 'доход' || v === '+' || v === 'in') return 'credit';
  if (v === 'debit' || v === 'expense' || v === 'расход' || v === '-' || v === 'out') return 'debit';
  // Default by amount sign
  return negative ? 'debit' : 'credit';
}

interface PreviewRow {
  row: ImportRow | null;
  errors: string[];
  raw: string[];
}

export default function ImportPage() {
  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategoriesCrud();
  const accounts = useMemo(() => accountsData ?? [], [accountsData]);
  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);

  const [rows, setRows] = useState<string[][]>([]);
  const [headerRow, setHeaderRow] = useState(true);
  const [mapping, setMapping] = useState<FieldKey[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('');
  const [dedupe, setDedupe] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMut = useImportTransactions();
  const toast = useToast();

  function onFile(file: File) {
    setResult(null);
    file.text().then((text) => {
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.showError('Файл пустой или не распознан');
        return;
      }
      setRows(parsed);
      // Initial mapping — guess from header row if there is one, otherwise
      // mark everything ignored so the user picks consciously.
      const cols = parsed[0]?.length ?? 0;
      const first = parsed[0] ?? [];
      const map: FieldKey[] = headerRow
        ? first.map((h: string) => guessField(h))
        : Array.from({ length: cols }, () => 'ignore');
      setMapping(map);
    }).catch(() => toast.showError('Не удалось прочитать файл'));
  }

  function setColumnField(i: number, v: FieldKey) {
    setMapping(prev => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  // Lookup helpers — category by name → id, account selected.
  const categoryByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.name.toLowerCase(), c.id);
    return map;
  }, [categories]);

  const dataRows = headerRow ? rows.slice(1) : rows;
  const preview: PreviewRow[] = useMemo(() => {
    if (mapping.length === 0 || dataRows.length === 0) return [];
    return dataRows.map((r) => {
      const errors: string[] = [];
      const get = (k: FieldKey): string => {
        const i = mapping.indexOf(k);
        return i >= 0 ? (r[i] ?? '').trim() : '';
      };
      if (!accountId) errors.push('Не выбран счёт');
      const dateRaw = get('date');
      const date = parseDate(dateRaw);
      if (!date) errors.push(`Не распознана дата «${dateRaw}»`);
      const amtRaw = get('amount');
      const amt = parseAmount(amtRaw);
      if (!amt) errors.push(`Не распознана сумма «${amtRaw}»`);
      const typeRaw = get('type');
      const negative = amt?.negative ?? false;
      const type = inferTypeCell(typeRaw, negative);
      const merchant = get('merchant') || undefined;
      const description = get('description') || undefined;
      const notes = get('notes') || undefined;
      const catName = get('category').toLowerCase();
      const catId = catName ? categoryByName.get(catName) : undefined;
      const categoryId = catId || (defaultCategoryId || undefined);

      if (errors.length > 0) return { row: null, errors, raw: r };
      return {
        row: {
          accountId, categoryId, amount: amt!.amount, type, date: date!,
          merchant, description, notes,
        },
        errors: [],
        raw: r,
      };
    });
  }, [dataRows, mapping, accountId, defaultCategoryId, categoryByName]);

  const validCount = preview.filter(p => p.row).length;
  const errorCount = preview.length - validCount;

  async function handleSubmit() {
    const rowsToSend = preview.filter(p => p.row).map(p => p.row!);
    if (rowsToSend.length === 0) {
      toast.showError('Нет валидных строк для импорта');
      return;
    }
    try {
      const res = await importMut.mutateAsync({ rows: rowsToSend, dedupe });
      setResult(res);
      toast.showSuccess(`Готово: добавлено ${res.inserted}, пропущено ${res.skipped}`);
    } catch (e: unknown) {
      const msg = extractApiError(e, 'Не удалось импортировать');
      toast.showError(msg);
    }
  }

  function reset() {
    setRows([]);
    setMapping([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── UI ────────────────────────────────────────────────────────────────
  const cols = mapping.length;

  return (
    <div className="p-5 sm:p-7 lg:p-9 space-y-5 pb-16 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Загрузите выписку CSV — мы разберём её на операции</div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-gray-900 dark:text-gray-100">Импорт операций</h1>
        </div>
        {rows.length > 0 && (
          <Button variant="secondary" onClick={reset}>Загрузить другой файл</Button>
        )}
      </div>

      {/* ─── Step 1: pick file ─── */}
      {rows.length === 0 && (
        <Card className="p-10">
          <label
            htmlFor="csv-file"
            className="block border-2 border-dashed border-gray-300 dark:border-[#262A3A] rounded-2xl p-10 text-center cursor-pointer hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
          >
            <div className="text-5xl mb-3" aria-hidden="true">📥</div>
            <div className="text-base font-medium text-gray-900 dark:text-gray-100">Перетащите CSV сюда</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">или нажмите, чтобы выбрать файл</div>
            <input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
          <div className="mt-5 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>Поддерживаются столбцы: <span className="font-mono">date, amount, type, merchant, description, notes, category</span>.</p>
            <p>Дубликаты определяются по сочетанию счёт + дата + сумма + тип + получатель.</p>
          </div>
        </Card>
      )}

      {/* ─── Step 2: mapping + preview ─── */}
      {rows.length > 0 && (
        <>
          {/* Settings */}
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="imp-account" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Счёт</label>
                <select
                  id="imp-account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Выберите счёт…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="imp-defcat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Категория по умолчанию <span className="text-gray-400 text-xs font-normal">если не указана</span>
                </label>
                <select
                  id="imp-defcat"
                  value={defaultCategoryId}
                  onChange={(e) => setDefaultCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Без категории</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2 pt-6">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={headerRow}
                    onChange={(e) => setHeaderRow(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  Первая строка — заголовки
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={dedupe}
                    onChange={(e) => setDedupe(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  Пропускать дубликаты
                </label>
              </div>
            </div>
          </Card>

          {/* Mapping */}
          <Card className="p-5">
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 mb-3">Сопоставьте колонки</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                    {Array.from({ length: cols }).map((_, i) => (
                      <th key={i} className="px-2 py-2 min-w-[160px]">
                        <select
                          value={mapping[i] ?? 'ignore'}
                          onChange={(e) => setColumnField(i, e.target.value as FieldKey)}
                          aria-label={`Поле для колонки ${i + 1}`}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          {(Object.keys(FIELD_LABELS) as FieldKey[]).map(k => (
                            <option key={k} value={k}>{FIELD_LABELS[k]}</option>
                          ))}
                        </select>
                      </th>
                    ))}
                  </tr>
                  {headerRow && rows[0] && (
                    <tr className="border-b border-gray-100 dark:border-[#262A3A]">
                      {rows[0].map((h, i) => (
                        <td key={i} className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{h}</td>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {dataRows.slice(0, 5).map((r, ri) => (
                    <tr key={ri} className="border-b border-gray-100 dark:border-[#262A3A] last:border-0">
                      {r.map((cell, i) => (
                        <td key={i} className="px-2 py-2 text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Preview / summary */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">Превью</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 tabular-nums">
                ✓ {validCount} валидных
              </span>
              {errorCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 tabular-nums">
                  ✗ {errorCount} с ошибками
                </span>
              )}
              <div className="ml-auto">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={importMut.isPending || validCount === 0 || !accountId}
                >
                  {importMut.isPending ? 'Импорт…' : `Импортировать ${validCount} ${validCount === 1 ? 'операцию' : validCount < 5 ? 'операции' : 'операций'}`}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-[#181B26]">
                  <tr className="text-left text-xs font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#262A3A]">
                    <th className="px-2 py-2 w-12">#</th>
                    <th className="px-2 py-2">Дата</th>
                    <th className="px-2 py-2">Тип</th>
                    <th className="px-2 py-2">Сумма</th>
                    <th className="px-2 py-2">Получатель</th>
                    <th className="px-2 py-2">Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((p, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'border-b border-gray-100 dark:border-[#262A3A] last:border-0',
                        p.errors.length > 0 && 'bg-red-50 dark:bg-red-900/10',
                      )}
                    >
                      <td className="px-2 py-2 text-xs text-gray-400 tabular-nums">{i + 1}</td>
                      {p.row ? (
                        <>
                          <td className="px-2 py-2 tabular-nums">{p.row.date}</td>
                          <td className="px-2 py-2">
                            <span className={cn(
                              'inline-flex px-1.5 py-0.5 rounded text-[11px]',
                              p.row.type === 'credit'
                                ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
                            )}>
                              {p.row.type === 'credit' ? 'Доход' : 'Расход'}
                            </span>
                          </td>
                          <td className="px-2 py-2 tabular-nums font-medium">{p.row.amount} ₽</td>
                          <td className="px-2 py-2 truncate max-w-[180px]">{p.row.merchant ?? '—'}</td>
                          <td className="px-2 py-2 truncate max-w-[220px] text-gray-500 dark:text-gray-400">{p.row.description ?? '—'}</td>
                        </>
                      ) : (
                        <td colSpan={5} className="px-2 py-2 text-xs text-red-600 dark:text-red-400">
                          {p.errors.join(' · ')} <span className="text-gray-500 dark:text-gray-400">→ {p.raw.join(' | ')}</span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                  Показаны первые 50 из {preview.length} строк
                </div>
              )}
            </div>
          </Card>

          {/* Result block after submit */}
          {result && (
            <Card className="p-5">
              <h2 className="text-[16px] font-semibold mb-3 text-gray-900 dark:text-gray-100">Результат</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-4 bg-green-50 dark:bg-green-500/10">
                  <div className="text-xs text-green-700 dark:text-green-400">Добавлено</div>
                  <div className="text-2xl font-semibold text-green-700 dark:text-green-400 tabular-nums">{result.inserted}</div>
                </div>
                <div className="rounded-xl p-4 bg-yellow-50 dark:bg-yellow-500/10">
                  <div className="text-xs text-yellow-700 dark:text-yellow-400">Пропущено (дубликаты)</div>
                  <div className="text-2xl font-semibold text-yellow-700 dark:text-yellow-400 tabular-nums">{result.skipped}</div>
                </div>
                <div className="rounded-xl p-4 bg-red-50 dark:bg-red-500/10">
                  <div className="text-xs text-red-700 dark:text-red-400">Ошибок</div>
                  <div className="text-2xl font-semibold text-red-700 dark:text-red-400 tabular-nums">{result.errors.length}</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-red-600 dark:text-red-400 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>Строка {e.index + 1}: {e.message}</li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
