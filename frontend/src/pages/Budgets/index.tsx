import { useState, useMemo } from 'react';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, Budget } from '../../hooks/useBudgets';
import { useCategories } from '../../hooks/useReports';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { QueryError } from '../../components/ui/QueryError';
import { formatMoney, sumMoney, cn } from '../../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays, endOfMonth, endOfYear, addDays } from 'date-fns';

const budgetSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  categoryId: z.string().optional(),
  amount: z.string().min(1, 'Укажите лимит'),
  currency: z.string().default('RUB'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().min(1, 'Укажите дату начала'),
  endDate: z.string().optional(),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Неделя',
  monthly: 'Месяц',
  yearly: 'Год',
};

function daysRemaining(period: string, endDate?: string): number {
  const today = new Date();
  if (endDate) return Math.max(0, differenceInDays(new Date(endDate), today));
  if (period === 'monthly') return Math.max(0, differenceInDays(endOfMonth(today), today));
  if (period === 'yearly')  return Math.max(0, differenceInDays(endOfYear(today), today));
  if (period === 'weekly')  return Math.max(0, differenceInDays(addDays(today, 7), today));
  return 0;
}

function daysIn(startDate?: string): number {
  if (!startDate) return 1;
  return Math.max(1, differenceInDays(new Date(), new Date(startDate)));
}

const INCOME_HEX = '#22C55E';
const EXPENSE_HEX = '#EF4444';
const WARN_HEX = '#F59E0B';
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

type Status = 'success' | 'warning' | 'error';
function statusOf(spent: number, amount: number): Status {
  if (amount <= 0) return 'success';
  const pct = (spent / amount) * 100;
  if (pct >= 100) return 'error';
  if (pct >= 80) return 'warning';
  return 'success';
}
const STATUS_COLOR: Record<Status, string> = {
  success: INCOME_HEX, warning: WARN_HEX, error: EXPENSE_HEX,
};
const STATUS_LABEL: Record<Status, string> = {
  success: 'В норме', warning: 'Близко', error: 'Превышен',
};
// Critical: tests B-17/B-18 search for `[class*="bg-green"]` / `bg-red` on the
// progress fill. Keep Tailwind classes for the fill color (not inline style).
const STATUS_FILL_CLASS: Record<Status, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};
const STATUS_BG_TINT: Record<Status, string> = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  error:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ── Decorative sparkline (matches Dashboard/Transactions look) ──────────────
function Sparkline({ color, points }: { color: string; points: number[] }) {
  const w = 80, h = 26;
  const max = Math.max(...points), min = Math.min(...points);
  const range = Math.max(1, max - min);
  const step = w / Math.max(1, points.length - 1);
  const ys = points.map((p) => h - ((p - min) / range) * h);
  const path = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${ys[i].toFixed(1)}`).join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const gid = `bg${color.replace('#','')}`;
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

// ── Compact stat card ───────────────────────────────────────────────────────
interface StatProps {
  label: string; value: string; sub: string;
  tintClass: string; accent: string;
  valueClass?: string;
  icon: React.ReactNode;
  sparkPoints?: number[];
}
function StatCard({ label, value, sub, tintClass, accent, valueClass, icon, sparkPoints }: StatProps) {
  return (
    <div className={cn('rounded-2xl p-4 min-h-[120px] flex flex-col gap-2 shadow-soft', tintClass)}>
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 rounded-lg grid place-items-center"
          style={{ backgroundColor: hexA(accent, 0.16), color: accent }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <div className={cn('text-[22px] font-semibold leading-tight tracking-tight tnum truncate', valueClass ?? 'text-gray-900 dark:text-white')}>
        {value}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="text-[11px] text-gray-500 dark:text-gray-400">{sub}</div>
        {sparkPoints && <Sparkline color={accent} points={sparkPoints} />}
      </div>
    </div>
  );
}

// ── Overall budget card (hero) — donut dial + numbers ───────────────────────
function OverallBudgetCard({
  limit, spent, count, periodLabel,
}: { limit: number; spent: number; count: number; periodLabel: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const remaining = limit - spent;
  const status = statusOf(spent, limit);
  const color = STATUS_COLOR[status];
  const size = 92, stroke = 10;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = (pct / 100) * C;

  return (
    <div className="rounded-2xl p-5 min-h-[148px] flex flex-col gap-3 shadow-soft bg-[#EEEBFB] dark:bg-[#1B1B30] relative overflow-hidden">
      <div className="flex items-center gap-2.5">
        <span
          className="w-8 h-8 rounded-[10px] grid place-items-center text-[14px]"
          style={{ backgroundColor: hexA(BRAND_HEX, 0.16), color: BRAND_HEX }}
          aria-hidden="true"
        >
          🎯
        </span>
        <div>
          <div className="text-[13px] font-medium text-gray-600 dark:text-gray-400">Общий бюджет</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-500">{count} активных · {periodLabel}</div>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={hexA(color, 0.18)} strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-[18px] font-semibold tracking-tight tnum"
               style={{ color }}>
            {pct}%
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[22px] font-semibold tracking-tight tnum">{formatMoney(spent)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 tnum">из {formatMoney(limit)}</div>
          <div className="text-xs mt-1.5 font-medium tnum"
               style={{ color: remaining >= 0 ? undefined : EXPENSE_HEX }}>
            {remaining >= 0
              ? <>Остаток <span className="text-gray-900 dark:text-gray-100">{formatMoney(remaining)}</span></>
              : <>Перерасход {formatMoney(-remaining)}</>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Period pill group ───────────────────────────────────────────────────────
function PeriodPills({ value, onChange }: { value: string; onChange: (v: 'weekly' | 'monthly' | 'yearly') => void }) {
  const opts: Array<{ value: 'weekly' | 'monthly' | 'yearly'; label: string }> = [
    { value: 'weekly',  label: 'Неделя' },
    { value: 'monthly', label: 'Месяц'  },
    { value: 'yearly',  label: 'Год'    },
  ];
  return (
    <div className="inline-flex items-center bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] rounded-full p-1 gap-1">
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'px-3.5 h-8 rounded-full text-sm transition-colors',
              active ? 'bg-brand-600 text-white font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Per-budget card (v3 design) ─────────────────────────────────────────────
function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  onEdit: (b: Budget) => void;
  onDelete: (id: string) => void;
}) {
  const spent = Number(budget.spent ?? '0');
  const limit = Number(budget.amount);
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const remaining = limit - spent;
  const status = statusOf(spent, limit);
  const color = STATUS_COLOR[status];

  const left = daysRemaining(budget.period, budget.endDate ?? undefined);
  const dIn  = daysIn(budget.startDate);
  const dailyRate = spent / dIn;
  const projected = left > 0 ? spent + dailyRate * left : spent;

  const catColor = budget.categoryColor ?? BRAND_HEX;
  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] shadow-soft flex flex-col gap-3.5">
      {/* Header: avatar + name/meta + status pill */}
      <div className="flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-[11px] grid place-items-center text-[15px] font-semibold flex-shrink-0"
          style={{ background: hexA(catColor, 0.14), color: catColor }}
          aria-hidden="true"
        >
          {initialOf(budget.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight truncate">{budget.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {budget.categoryName ?? 'Все категории'} · {PERIOD_LABELS[budget.period] ?? budget.period}
          </div>
        </div>
        <span className={cn('text-[11px] font-medium px-2.5 py-0.5 rounded-full flex-shrink-0', STATUS_BG_TINT[status])}>
          {STATUS_LABEL[status]}
        </span>
        <div className="flex gap-0.5 flex-shrink-0">
          <button
            type="button"
            aria-label="Редактировать"
            title="Редактировать"
            onClick={() => onEdit(budget)}
            className="text-gray-400 hover:text-brand-500 p-1 rounded transition-colors"
          >
            ✎
          </button>
          <button
            type="button"
            aria-label="Удалить"
            title="Удалить"
            onClick={() => onDelete(budget.id)}
            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Numbers + progress */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[22px] font-semibold tracking-tight tnum">{formatMoney(spent)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 tnum">из {formatMoney(limit)}</span>
        </div>
        <div className="relative h-2 rounded-full bg-gray-200 dark:bg-[#262A3A] overflow-hidden">
          {/* Tailwind class on the fill — required by B-17/B-18 selectors. */}
          <div
            className={cn('h-full rounded-full transition-[width] duration-500', STATUS_FILL_CLASS[status])}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
          {pct > 100 && (
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ backgroundImage: `repeating-linear-gradient(45deg, ${hexA(EXPENSE_HEX, 0.25)} 0 4px, transparent 4px 8px)` }}
            />
          )}
        </div>
        <div className="flex justify-between mt-2 text-xs tnum">
          <span className="font-medium" style={{ color }}>{pct}% использовано</span>
          <span className="text-gray-500 dark:text-gray-400">
            {remaining >= 0 ? `Остаток ${formatMoney(remaining)}` : 'Лимит превышен'}
          </span>
        </div>
      </div>

      {/* Footer: days + projection */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-[#262A3A]">
        <div>
          <div className="text-[11px] text-gray-500 dark:text-gray-500 mb-0.5">Осталось дней</div>
          <div className="text-sm font-medium tnum">{left > 0 ? left : '—'}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-500 dark:text-gray-500 mb-0.5">Прогноз к концу</div>
          <div
            className={cn('text-sm font-medium tnum', projected > limit ? 'text-expense' : 'text-gray-900 dark:text-gray-100')}
          >
            {formatMoney(projected)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Budget form (UNCHANGED — preserves form labels for E2E B-UI test) ──────
function BudgetForm({
  initial,
  categories,
  onClose,
  onSubmit,
  isLoading,
}: {
  initial?: Budget;
  categories: Array<{ id: string; name: string; type: string }>;
  onClose: () => void;
  onSubmit: (data: BudgetFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          categoryId: initial.categoryId ?? '',
          amount: initial.amount,
          currency: initial.currency,
          period: initial.period as 'weekly' | 'monthly' | 'yearly',
          startDate: initial.startDate,
          endDate: initial.endDate ?? '',
        }
      : {
          period: 'monthly',
          currency: 'RUB',
          startDate: format(new Date(), 'yyyy-MM-01'),
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
      <div>
        <label htmlFor="budget-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
        <input id="budget-name" {...register('name')} type="text" placeholder="Например: Продукты на март"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="budget-categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Категория</label>
        <select id="budget-categoryId" {...register('categoryId')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Все категории</option>
          {categories.filter((c) => c.type === 'expense').map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="budget-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Лимит, ₽</label>
        <input id="budget-amount" {...register('amount')} type="number" step="0.01" min="0" placeholder="0.00"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
        {/* `currency` is fixed to RUB — hidden field keeps form payload stable */}
        <input type="hidden" {...register('currency')} value="RUB" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Период</label>
        <select {...register('period')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="weekly">Недельный</option>
          <option value="monthly">Месячный</option>
          <option value="yearly">Годовой</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Начало</label>
          <input {...register('startDate')} type="date"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Конец (необяз.)</label>
          <input {...register('endDate')} type="date"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Отмена</Button>
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : initial ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Page (v3 design — synced with Babkoschet/app-budgets.jsx)
// ═════════════════════════════════════════════════════════════════════════════
export default function BudgetsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [groupByStatus, setGroupByStatus] = useState(true);

  const { data: budgetsData, isLoading, isError, refetch } = useBudgets();
  const { data: categoriesData } = useCategories();

  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const categories = (categoriesData as Array<{ id: string; name: string; type: string }>) ?? [];

  // Memoise off the raw query data — re-deriving on every render would
  // recreate budgets/activeAll/filtered references and defeat downstream memos.
  const activeAll = useMemo(
    () => ((budgetsData ?? []) as Budget[]).filter((b) => b.isActive),
    [budgetsData]
  );
  const filtered = useMemo(() => activeAll.filter((b) => b.period === period), [activeAll, period]);

  const totalLimit = Number(sumMoney(filtered.map((b) => b.amount)));
  const totalSpent = Number(sumMoney(filtered.map((b) => b.spent ?? '0')));
  const onTrack    = filtered.filter((b) => statusOf(Number(b.spent ?? 0), Number(b.amount)) === 'success');
  const close      = filtered.filter((b) => statusOf(Number(b.spent ?? 0), Number(b.amount)) === 'warning');
  const over       = filtered.filter((b) => statusOf(Number(b.spent ?? 0), Number(b.amount)) === 'error');

  const handleCreate = async (data: BudgetFormData) => {
    await createMutation.mutateAsync({
      name: data.name,
      categoryId: data.categoryId || undefined,
      amount: data.amount,
      currency: data.currency,
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
    });
    setShowForm(false);
  };

  const handleUpdate = async (data: BudgetFormData) => {
    if (!editBudget) return;
    await updateMutation.mutateAsync({
      id: editBudget.id,
      name: data.name,
      categoryId: data.categoryId || undefined,
      amount: data.amount,
      currency: data.currency,
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
    });
    setEditBudget(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const groups = groupByStatus
    ? [
        { key: 'error',   title: 'Превышены',        color: EXPENSE_HEX, items: over },
        { key: 'warning', title: 'Близко к лимиту',  color: WARN_HEX,    items: close },
        { key: 'success', title: 'В норме',          color: INCOME_HEX,  items: onTrack },
      ].filter((g) => g.items.length > 0)
    : [{ key: 'all', title: null as string | null, color: '', items: filtered }];

  const overlineMsg = over.length > 0
    ? `${over.length} ${over.length === 1 ? 'бюджет превышен' : 'бюджета превышены'}`
    : 'Все бюджеты под контролем';

  return (
    <div className="px-4 md:px-8 py-6 md:py-7 max-w-7xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">{overlineMsg}</div>
          <h1 className="m-0 text-2xl md:text-[28px] font-semibold tracking-tight">Бюджеты</h1>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
          className="h-10 px-4 rounded-xl"
          style={{ boxShadow: '0 6px 16px -8px #6366F1' }}
        >
          + Новый бюджет
        </Button>
      </div>

      {/* ── Hero row: overall + 3 stat cards ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-4">
        <OverallBudgetCard
          limit={totalLimit}
          spent={totalSpent}
          count={filtered.length}
          periodLabel={PERIOD_LABELS[period]}
        />
        <StatCard
          label="Активных" value={String(filtered.length)} sub={`из ${activeAll.length}`}
          tintClass="bg-[#EEF0FF] dark:bg-[#1A2230]"
          accent={BRAND_HEX}
          icon={<span className="text-[14px]">🎯</span>}
          sparkPoints={[3,3,4,4,5,5,5,6,6,6,7,7]}
        />
        <StatCard
          label="В норме" value={String(onTrack.length)} sub="до 80% лимита"
          tintClass="bg-[#E8F7EE] dark:bg-[#142421]"
          accent={INCOME_HEX} valueClass="text-income"
          icon={<span className="text-[14px]">✓</span>}
          sparkPoints={[2,3,3,4,4,5,4,5,5,5,5,5]}
        />
        <StatCard
          label="Превышены" value={String(over.length)} sub={over.length > 0 ? 'требуется внимание' : 'всё хорошо'}
          tintClass="bg-[#FDECEC] dark:bg-[#2A1A1F]"
          accent={EXPENSE_HEX} valueClass="text-expense"
          icon={<span className="text-[14px]">!</span>}
          sparkPoints={[0,0,1,0,1,1,1,2,1,2,1,1]}
        />
      </section>

      {/* ── Period switch + group toggle ── */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodPills value={period} onChange={setPeriod} />

        <label className="ml-auto inline-flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-pointer select-none">
          <span>Группировать по статусу</span>
          <span
            role="switch"
            aria-checked={groupByStatus}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setGroupByStatus((v) => !v); } }}
            onClick={() => setGroupByStatus((v) => !v)}
            className={cn(
              'w-9 h-5 rounded-full p-0.5 transition-colors',
              groupByStatus ? 'bg-brand-600' : 'bg-gray-300 dark:bg-[#262A3A]'
            )}
          >
            <span
              className={cn(
                'block w-4 h-4 rounded-full bg-white transition-transform',
                groupByStatus ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </span>
        </label>
      </div>

      {/* ── Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <QueryError message="Не удалось загрузить бюджеты" onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <Card className="py-16">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <span className="text-5xl mb-3" aria-hidden="true">📊</span>
            <p className="font-medium text-lg text-gray-900 dark:text-gray-100">Бюджеты не созданы</p>
            <p className="text-sm mt-1 mb-4">Создайте первый бюджет для контроля расходов</p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Создать бюджет
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.key}>
              {g.title && (
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} aria-hidden="true" />
                  <h3 className="m-0 text-sm font-semibold tracking-tight">{g.title}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] px-2 py-0.5 rounded-full">
                    {g.items.length}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {g.items.map((b) => (
                  <BudgetCard
                    key={b.id}
                    budget={b}
                    onEdit={setEditBudget}
                    onDelete={setDeleteId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Новый бюджет">
        <BudgetForm
          categories={categories}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          isLoading={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editBudget} onClose={() => setEditBudget(null)} title="Редактировать бюджет">
        {editBudget && (
          <BudgetForm
            initial={editBudget}
            categories={categories}
            onClose={() => setEditBudget(null)}
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Удалить бюджет">
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Вы уверены, что хотите удалить этот бюджет?
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
    </div>
  );
}
