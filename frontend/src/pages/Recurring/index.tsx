// ════════════════════════════════════════════════════════════════════════════
// Регулярные платежи — Recurring transactions page
// Backend already exposes /recurring CRUD + /recurring/apply.
// Page shows next-due cards grouped by status: "сегодня/просрочено",
// "на этой неделе", "позже". Manual "Применить сейчас" creates due txs.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useRecurring, useCreateRecurring, useUpdateRecurring, useDeleteRecurring,
  useApplyDueRecurring, Recurring, CreateRecurringInput, Frequency,
} from '@/hooks/useRecurring';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategoriesCrud } from '@/hooks/useCategories';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { QueryError } from '@/components/ui/QueryError';
import { useToast } from '@/components/ui/Toast';
import { formatMoney, cn } from '@/lib/utils';
import { format, differenceInCalendarDays } from 'date-fns';

const FREQ_LABEL: Record<Frequency, string> = {
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  biweekly: 'Раз в 2 недели',
  monthly: 'Ежемесячно',
  quarterly: 'Раз в квартал',
  yearly: 'Ежегодно',
};

const schema = z.object({
  accountId: z.string().min(1, 'Выберите счёт'),
  categoryId: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Некорректная сумма'),
  type: z.enum(['debit', 'credit']),
  merchant: z.string().max(255).optional(),
  description: z.string().max(500).optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.string().min(1, 'Укажите дату начала'),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function initialOf(s: string | null | undefined): string {
  return (s || '?').trim().slice(0, 1).toUpperCase();
}
function shortDate(iso: string): string {
  const MONTHS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;
}

function RecCard({
  r, onEdit, onDelete, onToggle,
}: {
  r: Recurring;
  onEdit: (r: Recurring) => void;
  onDelete: (r: Recurring) => void;
  onToggle: (r: Recurring) => void;
}) {
  const color = r.categoryColor ?? '#6366F1';
  const isIncome = r.type === 'credit';
  const today = new Date();
  const daysUntil = differenceInCalendarDays(new Date(r.nextDueDate), today);
  const overdue = daysUntil < 0;
  const dueToday = daysUntil === 0;
  const statusCls = overdue
    ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
    : dueToday
      ? 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
      : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300';
  const statusText = overdue
    ? `просрочено на ${Math.abs(daysUntil)} дн.`
    : dueToday
      ? 'сегодня'
      : `через ${daysUntil} ${daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'}`;

  return (
    <div className={cn(
      'rounded-2xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] p-5 shadow-soft group',
      !r.isActive && 'opacity-60',
    )}>
      <div className="flex items-center gap-3">
        <span
          className="w-11 h-11 rounded-xl grid place-items-center text-base font-semibold flex-shrink-0"
          style={{ background: hexA(color, 0.14), color }}
        >
          {initialOf(r.categoryName || r.merchant || r.description)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold truncate text-gray-900 dark:text-gray-100">
            {r.merchant || r.description || 'Платёж'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {r.accountName ?? '—'} · {FREQ_LABEL[r.frequency]}
            {r.categoryName && ` · ${r.categoryName}`}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className="text-[16px] font-semibold tabular-nums whitespace-nowrap"
            style={{ color: isIncome ? '#22C55E' : '#EF4444' }}
          >
            {isIncome ? '+' : '−'}{formatMoney(r.amount)}
          </div>
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium mt-1', statusCls)}>
            {statusText}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div>
          Следующий: <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">{shortDate(r.nextDueDate)}</span>
          {r.endDate && <span> · до {shortDate(r.endDate)}</span>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onToggle(r)}
            aria-label={r.isActive ? 'Остановить' : 'Возобновить'}
            title={r.isActive ? 'Остановить' : 'Возобновить'}
            className="w-7 h-7 grid place-items-center rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            {r.isActive ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => onEdit(r)}
            aria-label="Редактировать"
            className="w-7 h-7 grid place-items-center rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDelete(r)}
            aria-label="Удалить"
            className="w-7 h-7 grid place-items-center rounded-lg text-gray-500 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

function RecForm({ initial, onSubmit, isLoading }: {
  initial?: Recurring; onSubmit: (d: CreateRecurringInput) => Promise<void>; isLoading: boolean;
}) {
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategoriesCrud();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          accountId: initial.accountId,
          categoryId: initial.categoryId ?? '',
          amount: initial.amount,
          type: initial.type,
          merchant: initial.merchant ?? '',
          description: initial.description ?? '',
          frequency: initial.frequency,
          startDate: initial.startDate,
          endDate: initial.endDate ?? '',
          isActive: initial.isActive,
        }
      : {
          type: 'debit',
          frequency: 'monthly',
          startDate: format(new Date(), 'yyyy-MM-dd'),
          isActive: true,
          accountId: '',
          amount: '0.00',
        },
  });
  const txType = watch('type');

  const handleFinal = async (d: FormData) => {
    await onSubmit({
      accountId: d.accountId,
      categoryId: d.categoryId || null,
      amount: d.amount,
      type: d.type,
      merchant: d.merchant || undefined,
      description: d.description || undefined,
      frequency: d.frequency,
      startDate: d.startDate,
      endDate: d.endDate || null,
      isActive: d.isActive,
    });
  };

  const cls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <form onSubmit={handleSubmit(handleFinal)} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="rec-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
          <select id="rec-type" {...register('type')} className={cls}>
            <option value="debit">Расход</option>
            <option value="credit">Доход</option>
          </select>
        </div>
        <div>
          <label htmlFor="rec-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Периодичность</label>
          <select id="rec-frequency" {...register('frequency')} className={cls}>
            {(Object.keys(FREQ_LABEL) as Frequency[]).map(f => (
              <option key={f} value={f}>{FREQ_LABEL[f]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="rec-account" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Счёт</label>
        <select id="rec-account" {...register('accountId')} className={cls}>
          <option value="">Выберите счёт…</option>
          {(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {errors.accountId && <p className="mt-1 text-xs text-red-500">{errors.accountId.message}</p>}
      </div>

      <div>
        <label htmlFor="rec-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Категория</label>
        <select id="rec-category" {...register('categoryId')} className={cls}>
          <option value="">Без категории</option>
          {(categories ?? [])
            .filter(c => txType === 'credit' ? c.type === 'income' : c.type === 'expense')
            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="rec-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сумма, ₽</label>
          <input id="rec-amount" {...register('amount')} type="number" step="0.01" min="0" placeholder="0.00" className={cls} />
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
        </div>
        <div>
          <label htmlFor="rec-merchant" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Получатель</label>
          <input id="rec-merchant" {...register('merchant')} type="text" placeholder="Spotify / Аренда…" className={cls} />
        </div>
      </div>

      <div>
        <label htmlFor="rec-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание</label>
        <input id="rec-description" {...register('description')} type="text" placeholder="Необязательно" className={cls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="rec-start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Первый платёж</label>
          <input id="rec-start" {...register('startDate')} type="date" className={cls} />
          {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate.message}</p>}
        </div>
        <div>
          <label htmlFor="rec-end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Конец <span className="text-gray-400 text-xs font-normal">опц.</span>
          </label>
          <input id="rec-end" {...register('endDate')} type="date" className={cls} />
        </div>
      </div>

      {initial && (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" {...register('isActive')} className="rounded text-brand-600 focus:ring-brand-500" />
          Активен
        </label>
      )}

      <div className="pt-2">
        <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
          {isLoading ? 'Сохранение…' : initial ? 'Сохранить' : 'Создать платёж'}
        </Button>
      </div>
    </form>
  );
}

export default function RecurringPage() {
  const [showForm, setShowForm] = useState(false);
  const [editRec, setEditRec] = useState<Recurring | null>(null);
  const [deleteRec, setDeleteRec] = useState<Recurring | null>(null);

  const { data, isLoading, isError, refetch } = useRecurring();
  const createMut = useCreateRecurring();
  const updateMut = useUpdateRecurring();
  const deleteMut = useDeleteRecurring();
  const applyMut = useApplyDueRecurring();
  const toast = useToast();

  const list = useMemo(() => data ?? [], [data]);
  const active = list.filter(r => r.isActive);
  const archived = list.filter(r => !r.isActive);

  const groups = useMemo(() => {
    // `today` recomputed inside useMemo so the dep-array stays clean
    const now = new Date();
    const overdue: Recurring[] = [];
    const week: Recurring[] = [];
    const later: Recurring[] = [];
    for (const r of active) {
      const d = differenceInCalendarDays(new Date(r.nextDueDate), now);
      if (d <= 0) overdue.push(r);
      else if (d <= 7) week.push(r);
      else later.push(r);
    }
    return { overdue, week, later };
  }, [active]);

  const monthlyDebits = active
    .filter(r => r.type === 'debit')
    .reduce((s, r) => {
      const perMonth: Record<Frequency, number> = {
        daily: 30, weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1/3, yearly: 1/12,
      };
      return s + Number(r.amount) * perMonth[r.frequency];
    }, 0);
  const monthlyCredits = active
    .filter(r => r.type === 'credit')
    .reduce((s, r) => {
      const perMonth: Record<Frequency, number> = {
        daily: 30, weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1/3, yearly: 1/12,
      };
      return s + Number(r.amount) * perMonth[r.frequency];
    }, 0);

  const handleCreate = async (d: CreateRecurringInput) => {
    await createMut.mutateAsync(d);
    setShowForm(false);
  };
  const handleUpdate = async (d: CreateRecurringInput) => {
    if (!editRec) return;
    await updateMut.mutateAsync({ id: editRec.id, ...d });
    setEditRec(null);
  };
  const handleDelete = async () => {
    if (!deleteRec) return;
    await deleteMut.mutateAsync(deleteRec.id);
    setDeleteRec(null);
  };
  const handleToggle = async (r: Recurring) => {
    await updateMut.mutateAsync({ id: r.id, isActive: !r.isActive });
  };
  const handleApplyNow = async () => {
    try {
      const out = await applyMut.mutateAsync();
      toast.showSuccess(`Создано операций: ${out.created}`);
    } catch {
      toast.showError('Не удалось применить регулярки');
    }
  };

  if (isLoading) {
    return (
      <div className="p-7 lg:p-9 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }
  if (isError) {
    return <div className="p-7"><QueryError message="Не удалось загрузить регулярные платежи" onRetry={() => void refetch()} /></div>;
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9 space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">
            {active.length} активных · {archived.length} в архиве
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-gray-900 dark:text-gray-100">Регулярные платежи</h1>
        </div>
        <div className="flex items-center gap-2">
          {groups.overdue.length > 0 && (
            <Button variant="secondary" onClick={handleApplyNow} disabled={applyMut.isPending}>
              {applyMut.isPending ? 'Применяю…' : `▶ Применить ${groups.overdue.length}`}
            </Button>
          )}
          <Button variant="primary" onClick={() => setShowForm(true)}>+ Новый платёж</Button>
        </div>
      </div>

      {/* Summary tiles */}
      {active.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5 shadow-soft bg-[#E8F7EE] dark:bg-[#142421]">
            <div className="text-[13px] text-gray-600 dark:text-gray-400">Регулярный доход</div>
            <div className="text-[22px] font-semibold mt-1 tabular-nums" style={{ color: '#22C55E' }}>
              +{formatMoney(monthlyCredits.toFixed(2))}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">в среднем за месяц</div>
          </div>
          <div className="rounded-2xl p-5 shadow-soft bg-[#FDECEC] dark:bg-[#2A1A1F]">
            <div className="text-[13px] text-gray-600 dark:text-gray-400">Регулярные расходы</div>
            <div className="text-[22px] font-semibold mt-1 tabular-nums" style={{ color: '#EF4444' }}>
              −{formatMoney(monthlyDebits.toFixed(2))}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">в среднем за месяц</div>
          </div>
          <div className="rounded-2xl p-5 shadow-soft bg-[#EEEBFB] dark:bg-[#1B1B30]">
            <div className="text-[13px] text-gray-600 dark:text-gray-400">Чистый поток</div>
            <div className="text-[22px] font-semibold mt-1 tabular-nums text-brand-600 dark:text-brand-400">
              {monthlyCredits - monthlyDebits >= 0 ? '+' : '−'}{formatMoney(Math.abs(monthlyCredits - monthlyDebits).toFixed(2))}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">в месяц от регулярок</div>
          </div>
        </div>
      )}

      {/* Empty */}
      {active.length === 0 && archived.length === 0 && (
        <Card className="py-16">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <span className="text-5xl mb-3">🔁</span>
            <p className="font-medium text-lg">Регулярных платежей нет</p>
            <p className="text-sm mt-1 mb-4">Аренда, подписки, зарплата — настройте раз и забудьте.</p>
            <Button variant="primary" onClick={() => setShowForm(true)}>Создать платёж</Button>
          </div>
        </Card>
      )}

      {/* Sections */}
      {groups.overdue.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <span className="text-red-500">●</span> Сегодня и просрочено
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">{groups.overdue.length}</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.overdue.map(r => (
              <RecCard key={r.id} r={r} onEdit={setEditRec} onDelete={setDeleteRec} onToggle={handleToggle} />
            ))}
          </div>
        </section>
      )}

      {groups.week.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <span className="text-yellow-500">●</span> На этой неделе
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">{groups.week.length}</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.week.map(r => (
              <RecCard key={r.id} r={r} onEdit={setEditRec} onDelete={setDeleteRec} onToggle={handleToggle} />
            ))}
          </div>
        </section>
      )}

      {groups.later.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <span className="text-gray-400">●</span> Позже
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">{groups.later.length}</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.later.map(r => (
              <RecCard key={r.id} r={r} onEdit={setEditRec} onDelete={setDeleteRec} onToggle={handleToggle} />
            ))}
          </div>
        </section>
      )}

      {archived.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold mb-3 text-gray-500 dark:text-gray-400">Архив</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {archived.map(r => (
              <RecCard key={r.id} r={r} onEdit={setEditRec} onDelete={setDeleteRec} onToggle={handleToggle} />
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Новый регулярный платёж">
        <RecForm onSubmit={handleCreate} isLoading={createMut.isPending} />
      </Modal>
      <Modal open={!!editRec} onClose={() => setEditRec(null)} title="Редактировать платёж">
        {editRec && <RecForm initial={editRec} onSubmit={handleUpdate} isLoading={updateMut.isPending} />}
      </Modal>
      <Modal open={!!deleteRec} onClose={() => setDeleteRec(null)} title="Удалить платёж">
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Удалить регулярный платёж <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteRec?.merchant || deleteRec?.description || 'без названия'}</span>?
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Уже созданные операции останутся в истории — затронется только будущее.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteRec(null)}>Отмена</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Удаление…' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
