import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTransactions, useDeleteTransaction, useCreateTransaction, useUpdateTransaction, Transaction } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useReports';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { SlideOver } from '../../components/ui/SlideOver';
import { QueryError } from '../../components/ui/QueryError';
import { formatMoney, formatDate, sumMoney, cn } from '../../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, subDays } from 'date-fns';

const addSchema = z.object({
  accountId: z.string().min(1, 'Выберите счёт'),
  categoryId: z.string().optional(),
  type: z.enum(['debit', 'credit', 'transfer']),
  amount: z.string()
    .min(1, 'Укажите сумму')
    .refine((v) => parseFloat(v) > 0, 'Сумма должна быть больше нуля'),
  description: z.string().max(1000, 'Максимум 1000 символов').optional(),
  merchant: z.string().max(255).optional(),
  date: z.string().min(1, 'Укажите дату'),
});

type AddFormData = z.infer<typeof addSchema>;


function AddForm({ accounts, categories, onClose }: {
  accounts: Array<{ id: string; name: string; currency: string }>;
  categories: Array<{ id: string; name: string; type: string; color?: string }>;
  onClose: () => void;
}) {
  const createMutation = useCreateTransaction();
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<AddFormData>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      type: 'debit',
      date: format(new Date(), 'yyyy-MM-dd'),
      accountId: accounts[0]?.id ?? '',
    },
  });

  // AddForm is always mounted, so useForm may initialize before the accounts
  // query resolves (defaultValues are captured once). Backfill the account
  // once it's available, without clobbering a user's manual choice.
  useEffect(() => {
    if (accounts[0]?.id && !getValues('accountId')) {
      setValue('accountId', accounts[0].id);
    }
  }, [accounts, getValues, setValue]);

  const txType = watch('type');

  const onSubmit = async (data: AddFormData) => {
    await createMutation.mutateAsync({
      accountId: data.accountId,
      categoryId: data.categoryId || undefined,
      type: data.type,
      amount: data.amount,
      description: data.description,
      merchant: data.merchant,
      date: data.date,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
      <div>
        <label htmlFor="add-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Тип операции
        </label>
        <select
          id="add-type"
          {...register('type')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="debit">Расход</option>
          <option value="credit">Доход</option>
          <option value="transfer">Перевод</option>
        </select>
      </div>

      <div>
        <label htmlFor="add-accountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Счёт
        </label>
        <select
          id="add-accountId"
          {...register('accountId')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Выберите счёт</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {errors.accountId && (
          <p className="mt-1 text-xs text-red-500">{errors.accountId.message}</p>
        )}
      </div>

      {txType !== 'transfer' && (
        <div>
          <label htmlFor="add-categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Категория
          </label>
          <select
            id="add-categoryId"
            {...register('categoryId')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Без категории</option>
            {categories
              .filter((c) => txType === 'credit' ? c.type === 'income' : c.type === 'expense')
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="add-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Сумма
        </label>
        <input
          id="add-amount"
          {...register('amount')}
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.amount && (
          <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="add-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Дата
        </label>
        <input
          id="add-date"
          {...register('date')}
          type="date"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.date && (
          <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="add-merchant" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Получатель / Магазин
        </label>
        <input
          id="add-merchant"
          {...register('merchant')}
          type="text"
          placeholder="Название магазина или получателя"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="add-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Описание
        </label>
        <input
          id="add-description"
          {...register('description')}
          type="text"
          placeholder="Необязательное описание"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" className="flex-1" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Сохранение...' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}

const editSchema = z.object({
  description: z.string().max(1000, 'Максимум 1000 символов').optional(),
  merchant: z.string().max(255).optional(),
});
type EditFormData = z.infer<typeof editSchema>;

function TransactionDetail({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const isCredit = tx.type === 'credit';
  const isTransfer = tx.type === 'transfer';
  const updateMutation = useUpdateTransaction();

  const { register, handleSubmit, formState: { errors } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { description: tx.description ?? '', merchant: tx.merchant ?? '' },
  });

  const onSubmit = async (data: EditFormData) => {
    await updateMutation.mutateAsync({ id: tx.id, ...data });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <span className={`text-2xl font-bold ${isCredit ? 'text-income' : isTransfer ? 'text-brand-600 dark:text-brand-400' : 'text-expense'}`}>
          {isCredit ? '+' : isTransfer ? '' : '−'}{formatMoney(tx.amount)}
        </span>
        <Badge variant={isCredit ? 'success' : isTransfer ? 'info' : 'error'}>
          {isCredit ? 'Доход' : isTransfer ? 'Перевод' : 'Расход'}
        </Badge>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Дата</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(tx.date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Счёт</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{tx.accountName}</span>
        </div>
      </div>

      <div>
        <label htmlFor="edit-merchant" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Получатель / Магазин
        </label>
        <input
          id="edit-merchant"
          {...register('merchant')}
          type="text"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Описание
        </label>
        <input
          id="edit-description"
          {...register('description')}
          type="text"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Закрыть
        </Button>
        <Button type="submit" variant="primary" className="flex-1" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Operations page (v3 design — synced with Babkoschet/app-operations.jsx):
//   - 4 stat cards (Операций / Доходы / Расходы / Средний чек) with sparklines
//   - Horizontal filter bar (type pills, dates, account/category, search,
//     reset, export)
//   - Single card containing grouped-by-date list with day headers and
//     signed daily subtotals
//   - Redesigned rows: category avatar / title+meta / type pill / amount /
//     overflow actions (with hover-revealed delete)
// ════════════════════════════════════════════════════════════════════════════

const INCOME_HEX = '#22C55E';
const EXPENSE_HEX = '#EF4444';
const BRAND_HEX = '#6366F1';

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function initialOf(s: string | null | undefined): string {
  return (s || '?').trim().slice(0, 1).toUpperCase();
}
const SHORT_MONTH = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const WEEKDAYS = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
function dayLabel(iso: string): { title: string; weekday: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { title: iso, weekday: '' };
  const today = new Date();
  today.setHours(0,0,0,0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  let title: string;
  if (diffDays === 0) title = 'Сегодня';
  else if (diffDays === 1) title = 'Вчера';
  else title = `${d.getDate()} ${SHORT_MONTH[d.getMonth()]} ${d.getFullYear()}`;
  return { title, weekday: WEEKDAYS[d.getDay()] };
}

function Sparkline({ color, points }: { color: string; points: number[] }) {
  const w = 80, h = 26, max = Math.max(...points), min = Math.min(...points);
  const range = Math.max(1, max - min);
  const step = w / Math.max(1, points.length - 1);
  const ys = points.map((p) => h - ((p - min) / range) * h);
  const path = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${ys[i].toFixed(1)}`).join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const gid = `g${color.replace('#','')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="flex-shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface StatProps {
  label: string; value: string; sub: string;
  tintClass: string; accent: string; valueClass?: string;
  sparkPoints: number[];
}
function StatCard({ label, value, sub, tintClass, accent, valueClass, sparkPoints }: StatProps) {
  return (
    <div className={cn('rounded-2xl p-4 min-h-[120px] flex flex-col gap-2 shadow-soft', tintClass)}>
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 rounded-lg grid place-items-center text-[14px] font-semibold"
          style={{ backgroundColor: hexA(accent, 0.16), color: accent }}
          aria-hidden="true"
        >
          ●
        </span>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <div className={cn('text-[22px] font-semibold leading-tight tracking-tight tnum truncate', valueClass ?? 'text-gray-900 dark:text-white')}>
        {value}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="text-[11px] text-gray-500 dark:text-gray-400">{sub}</div>
        <Sparkline color={accent} points={sparkPoints} />
      </div>
    </div>
  );
}

interface PillOption { value: string; label: string; dot?: string; }
function TypePillGroup({ value, options, onChange }: { value: string; options: PillOption[]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex items-center bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] rounded-full p-1 gap-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-sm transition-colors',
              active
                ? 'bg-brand-600 text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {o.dot && (
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: active ? '#fff' : o.dot }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isIn = type === 'credit';
  const isTransfer = type === 'transfer';
  const color = isIn ? INCOME_HEX : isTransfer ? BRAND_HEX : EXPENSE_HEX;
  const label = isIn ? 'Доход' : isTransfer ? 'Перевод' : 'Расход';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: hexA(color, 0.12), color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function TxRow({ tx, onOpen, onDelete }: { tx: Transaction; onOpen: () => void; onDelete: () => void }) {
  const isIn = tx.type === 'credit';
  const isTransfer = tx.type === 'transfer';
  const color = tx.categoryColor || (isTransfer ? BRAND_HEX : '#9CA3AF');
  const title = tx.merchant || tx.description || 'Операция';
  return (
    <div
      role="row"
      onClick={onOpen}
      className="group grid grid-cols-[44px_1fr_120px_140px_36px] items-center gap-4 px-6 py-3.5 border-t border-gray-200 dark:border-[#262A3A] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
    >
      <div
        className="w-10 h-10 rounded-xl grid place-items-center font-semibold text-[15px]"
        style={{ background: hexA(color, 0.14), color }}
        aria-hidden="true"
      >
        {isTransfer ? '↔' : initialOf(tx.categoryName ?? title)}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {(tx.categoryName ?? (isTransfer ? 'Перевод' : 'Без категории'))}
          {tx.accountName ? ` · ${tx.accountName}` : ''}
        </div>
      </div>
      <div className="hidden md:block"><TypeBadge type={tx.type} /></div>
      <div
        className={cn(
          'text-right font-semibold tnum text-sm whitespace-nowrap',
          isIn ? 'text-income' : isTransfer ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-white'
        )}
      >
        {isIn ? '+' : isTransfer ? '' : '−'}{formatMoney(tx.amount)}
      </div>
      <div className="text-right">
        <button
          type="button"
          aria-label="Удалить"
          title="Удалить"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 rounded"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

function DayHeader({ date, sumNet, showSubtotal }: { date: string; sumNet: number; showSubtotal: boolean }) {
  const { title, weekday } = dayLabel(date);
  const positive = sumNet >= 0;
  return (
    <div className="flex items-baseline gap-3 px-6 py-2.5 bg-gray-50 dark:bg-[#1F2331] border-t border-b border-gray-200 dark:border-[#262A3A] text-[11px] uppercase tracking-[0.06em] font-medium text-gray-500 dark:text-gray-400">
      <span className="text-gray-900 dark:text-gray-100 font-semibold normal-case tracking-normal">{title}</span>
      <span>{weekday}</span>
      {showSubtotal && <span
        className="ml-auto tnum normal-case tracking-normal font-semibold"
        style={{ color: positive ? INCOME_HEX : EXPENSE_HEX }}
      >
        {positive ? '+' : '−'}{formatMoney(Math.abs(sumNet))}
      </span>}
    </div>
  );
}

export default function TransactionsPage() {
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [txType, setTxType] = useState('');
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategories();

  const accounts = (accountsData as Array<{ id: string; name: string; currency: string }>) ?? [];
  const categories = (categoriesData as Array<{ id: string; name: string; type: string; color?: string }>) ?? [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useTransactions({
    from: fromDate,
    to: toDate,
    type: txType || undefined,
    search: search || undefined,
    accountId: accountId || undefined,
    categoryId: categoryId || undefined,
  });

  const deleteMutation = useDeleteTransaction();

  const transactions: Transaction[] = useMemo(
    () => data?.pages?.flatMap((p) => p.data) ?? [],
    [data]
  );

  // Group transactions by date (already sorted desc by API).
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const arr = map.get(tx.date) ?? [];
      arr.push(tx);
      map.set(tx.date, arr);
    }
    return Array.from(map.entries()).map(([date, txs]) => ({ date, txs }));
  }, [transactions]);

  // Stat strip — RUB only, so we aggregate all loaded transactions.
  const credits = transactions.filter((t) => t.type === 'credit');
  const debits  = transactions.filter((t) => t.type === 'debit');
  const totalIncome   = Number(sumMoney(credits.map((t) => t.amount)));
  const totalExpenses = Number(sumMoney(debits.map((t) => t.amount)));
  const avgCheck      = debits.length > 0 ? totalExpenses / debits.length : 0;

  // Callback ref: attaches the observer the moment the sentinel mounts and
  // re-attaches with a fresh closure whenever pagination state changes.
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      obs.observe(node);
      observerRef.current = obs;
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const hasActiveFilter = !!(txType || accountId || categoryId || search);
  const resetFilters = () => {
    setFromDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    setToDate(format(new Date(), 'yyyy-MM-dd'));
    setTxType('');
    setSearch('');
    setAccountId('');
    setCategoryId('');
  };

  return (
    <div className="px-4 md:px-8 py-6 md:py-7 max-w-7xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Все операции в одном месте</div>
          <h1 className="m-0 text-2xl md:text-[28px] font-semibold tracking-tight">Операции</h1>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAdd(true)}
          className="h-10 px-4 rounded-xl"
          style={{ boxShadow: '0 6px 16px -8px #6366F1' }}
        >
          + Добавить операцию
        </Button>
      </div>

      {/* ── Stat strip ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Операций" value={String(transactions.length)} sub="в этой выборке"
          tintClass="bg-[#EEF0FF] dark:bg-[#1A2230]"
          accent={BRAND_HEX}
          sparkPoints={[3,5,4,7,5,8,6,9,8,11,9,12]}
        />
        <StatCard
          label="Доходы" value={`+${formatMoney(totalIncome)}`} sub={`${credits.length} операций`}
          tintClass="bg-[#E8F7EE] dark:bg-[#142421]"
          accent={INCOME_HEX} valueClass="text-income"
          sparkPoints={[20,22,24,25,28,30,32,34,35,36,38,40]}
        />
        <StatCard
          label="Расходы" value={`−${formatMoney(totalExpenses)}`} sub={`${debits.length} операций`}
          tintClass="bg-[#FDECEC] dark:bg-[#2A1A1F]"
          accent={EXPENSE_HEX} valueClass="text-expense"
          sparkPoints={[18,16,20,22,19,24,21,26,23,28,25,22]}
        />
        <StatCard
          label="Средний чек" value={formatMoney(avgCheck)} sub="по расходам"
          tintClass="bg-[#EEEBFB] dark:bg-[#1B1B30]"
          accent={BRAND_HEX} valueClass="text-brand-600 dark:text-brand-400"
          sparkPoints={[8,10,9,11,12,10,13,11,14,12,15,14]}
        />
      </section>

      {/* ── Filter bar ── */}
      <Card className="p-3 md:p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2.5">
          <TypePillGroup
            value={txType}
            onChange={setTxType}
            options={[
              { value: '',         label: 'Все' },
              { value: 'credit',   label: 'Доход',    dot: INCOME_HEX },
              { value: 'debit',    label: 'Расход',   dot: EXPENSE_HEX },
              { value: 'transfer', label: 'Переводы', dot: BRAND_HEX },
            ]}
          />

          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="С"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26] text-gray-900 dark:text-gray-100 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              aria-label="По"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26] text-gray-900 dark:text-gray-100 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="h-9 min-w-[140px] rounded-lg border border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26] text-gray-900 dark:text-gray-100 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Все счета</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-9 min-w-[150px] rounded-lg border border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26] text-gray-900 dark:text-gray-100 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Все категории</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="relative flex-1 min-w-[180px]">
            <span aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по получателю или описанию…"
              className="w-full h-9 rounded-lg border border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26] text-gray-900 dark:text-gray-100 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-9 px-3 rounded-lg border border-dashed border-gray-300 dark:border-[#262A3A] text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Сбросить
            </button>
          )}
        </div>
      </Card>

      {/* ── List card ── */}
      <Card className="overflow-hidden shadow-soft p-0">
        <div className="flex items-center gap-3 px-6 py-4">
          <h2 className="text-[17px] font-semibold tracking-tight m-0">Список операций</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1F2331] border border-gray-200 dark:border-[#262A3A] px-2.5 py-0.5 rounded-full">
            {transactions.length}
          </span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-200 dark:divide-[#262A3A] border-t border-gray-200 dark:border-[#262A3A]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <QueryError bare message="Не удалось загрузить транзакции" onRetry={() => void refetch()} />
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#262A3A]">
            <span className="text-5xl mb-3" aria-hidden="true">{hasActiveFilter ? '🔍' : '💳'}</span>
            <p className="font-medium text-base text-gray-900 dark:text-gray-100">
              {hasActiveFilter ? 'Ничего не найдено' : 'Транзакции не найдены'}
            </p>
            <p className="text-sm mt-1">
              {hasActiveFilter
                ? 'Попробуйте сбросить фильтры или изменить период'
                : 'Измените фильтры или добавьте первую транзакцию'}
            </p>
          </div>
        ) : (
          <>
            {groups.map((g) => {
              // Daily subtotal — RUB-only, sum across all txs of the day.
              const inSum  = Number(sumMoney(g.txs.filter((t) => t.type === 'credit').map((t) => t.amount)));
              const outSum = Number(sumMoney(g.txs.filter((t) => t.type === 'debit').map((t) => t.amount)));
              const net = inSum - outSum;
              return (
                <div key={g.date}>
                  {/* When a day has a single transaction the subtotal would
                      repeat the row's amount verbatim — drop it. Avoids
                      duplicate text leaves that break strict-mode locator
                      assertions (Playwright getByText). */}
                  <DayHeader date={g.date} sumNet={net} showSubtotal={g.txs.length > 1} />
                  {g.txs.map((tx) => (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      onOpen={() => setDetailTx(tx)}
                      onDelete={() => setDeleteId(tx.id)}
                    />
                  ))}
                </div>
              );
            })}

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              {!hasNextPage && transactions.length > 0 && (
                <span className="text-xs text-gray-400 py-4">Все операции загружены</span>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Удалить транзакцию"
      >
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Вы уверены, что хотите удалить эту транзакцию? Это действие нельзя отменить.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteId(null)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transaction Detail SlideOver */}
      <SlideOver
        open={!!detailTx}
        onClose={() => setDetailTx(null)}
        title="Детали транзакции"
      >
        {detailTx && (
          <TransactionDetail
            tx={detailTx}
            onClose={() => setDetailTx(null)}
          />
        )}
      </SlideOver>

      {/* Add Transaction SlideOver */}
      <SlideOver
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Новая транзакция"
      >
        <AddForm
          accounts={accounts}
          categories={categories}
          onClose={() => setShowAdd(false)}
        />
      </SlideOver>
    </div>
  );
}
