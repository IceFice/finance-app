// ════════════════════════════════════════════════════════════════════════════
// Цели накопления — savings goals
// Card per goal with circular progress, deadline countdown, on-track tag.
// Backend computes progress from linked account balance or a manual amount.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, Goal, CreateGoalInput,
} from '@/hooks/useGoals';
import { useAccounts } from '@/hooks/useAccounts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { QueryError } from '@/components/ui/QueryError';
import { formatMoney, cn } from '@/lib/utils';
import { hexA } from '@/lib/colors';

const ACCENT = '#6366F1';
const ICONS = ['🐷', '🎯', '🏖️', '🚗', '🏠', '💍', '🎓', '💻', '🎁', '✈️', '📱', '🛋️'];
const COLORS = [
  '#6366F1', '#22C55E', '#EC4899', '#F59E0B', '#0EA5E9', '#A855F7',
  '#10B981', '#EF4444', '#14B8A6', '#3B82F6',
];

const schema = z.object({
  name: z.string().min(1, 'Введите название').max(100),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Некорректная сумма'),
  currentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  deadline: z.string().optional(),
  sourceAccountId: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;


function Dial({ pct, color, size = 96 }: { pct: number; color: string; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * C;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={hexA(color, 0.18)} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-[15px] font-semibold tabular-nums" style={{ color }}>{Math.round(pct)}%</div>
      </div>
    </div>
  );
}

function GoalCard({ g, onEdit, onDelete }: {
  g: Goal; onEdit: (g: Goal) => void; onDelete: (g: Goal) => void;
}) {
  const color = g.color ?? ACCENT;
  const tone = g.onTrack ? 'success' : 'warning';
  const toneCls = tone === 'success'
    ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
    : 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400';
  return (
    <div className="rounded-2xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] p-5 shadow-soft group">
      <div className="flex items-center gap-4">
        <Dial pct={g.progressPct} color={color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">{g.icon ?? '🎯'}</span>
            <span className="text-base font-semibold truncate text-gray-900 dark:text-gray-100">{g.name}</span>
            {!g.isActive && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500">архив</span>
            )}
          </div>
          <div className="text-sm tabular-nums text-gray-900 dark:text-gray-100">
            <span className="font-semibold">{formatMoney(g.currentAmount)}</span>
            <span className="text-gray-500 dark:text-gray-400"> из {formatMoney(g.targetAmount)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full font-medium', toneCls)}>
              {g.onTrack ? 'В графике' : 'Отстаём'}
            </span>
            {g.daysLeft !== null && (
              <span className="text-gray-500 dark:text-gray-400">
                {g.daysLeft === 0 ? 'дедлайн сегодня' : `осталось ${g.daysLeft} ${g.daysLeft === 1 ? 'день' : g.daysLeft < 5 ? 'дня' : 'дней'}`}
              </span>
            )}
            {g.sourceAccountId && (
              <span className="text-gray-500 dark:text-gray-400">· привязан к счёту</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(g)}
            aria-label={`Редактировать ${g.name}`}
            className="w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDelete(g)}
            aria-label={`Удалить ${g.name}`}
            className="w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            🗑
          </button>
        </div>
      </div>
      {/* Bar */}
      <div className="h-1.5 mt-4 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(100, g.progressPct)}%`, background: color }} />
      </div>
      <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
        Осталось накопить {formatMoney(g.remaining)}
      </div>
    </div>
  );
}

function GoalForm({ initial, onSubmit, isLoading }: {
  initial?: Goal; onSubmit: (d: CreateGoalInput) => Promise<void>; isLoading: boolean;
}) {
  const { data: accounts } = useAccounts();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          name: initial.name,
          targetAmount: initial.targetAmount,
          currentAmount: initial.manualAmount,
          deadline: initial.deadline ?? '',
          sourceAccountId: initial.sourceAccountId ?? '',
          color: initial.color ?? '#6366F1',
          icon: initial.icon ?? '🎯',
          isActive: initial.isActive,
        }
      : { color: '#6366F1', icon: '🎯', isActive: true, currentAmount: '0.00' },
  });
  const color = watch('color') ?? '#6366F1';
  const icon = watch('icon') ?? '🎯';
  const sourceAccountId = watch('sourceAccountId');

  const handleFinal = async (d: FormData) => {
    await onSubmit({
      name: d.name,
      targetAmount: d.targetAmount,
      currentAmount: d.currentAmount || '0.00',
      deadline: d.deadline ? d.deadline : null,
      sourceAccountId: d.sourceAccountId ? d.sourceAccountId : null,
      color: d.color, icon: d.icon,
      isActive: d.isActive,
    });
  };

  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <form onSubmit={handleSubmit(handleFinal)} className="p-6 space-y-4">
      <div className="flex items-center gap-3 -mt-2">
        <div className="w-14 h-14 rounded-2xl grid place-items-center text-2xl flex-shrink-0"
             style={{ background: hexA(color, 0.18), color }}>
          {icon}
        </div>
        <div className="flex-1">
          <label htmlFor="goal-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
          <input id="goal-name" {...register('name')} type="text" placeholder="Например: Отпуск 2026" className={inputCls} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="goal-target" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Цель, ₽</label>
          <input id="goal-target" {...register('targetAmount')} type="number" step="0.01" min="0.01" placeholder="100000.00" className={inputCls} />
          {errors.targetAmount && <p className="mt-1 text-xs text-red-500">{errors.targetAmount.message}</p>}
        </div>
        <div>
          <label htmlFor="goal-deadline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дедлайн</label>
          <input id="goal-deadline" {...register('deadline')} type="date" className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="goal-source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Источник <span className="text-gray-400 text-xs font-normal">— баланс счёта = текущая сумма</span>
        </label>
        <select id="goal-source" {...register('sourceAccountId')} className={inputCls}>
          <option value="">Без привязки (ручная сумма)</option>
          {(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {!sourceAccountId && (
        <div>
          <label htmlFor="goal-current" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Уже накоплено, ₽
          </label>
          <input id="goal-current" {...register('currentAmount')} type="number" step="0.01" min="0" className={inputCls} />
        </div>
      )}

      <div>
        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Иконка</div>
        <div className="flex flex-wrap gap-1.5">
          {ICONS.map(i => (
            <button
              key={i} type="button"
              onClick={() => setValue('icon', i, { shouldValidate: true })}
              aria-label={`Иконка ${i}`}
              className={cn(
                'w-9 h-9 rounded-lg grid place-items-center text-lg border-2 transition-transform',
                icon === i ? 'border-brand-600 scale-110' : 'border-transparent hover:scale-105',
              )}
            >{i}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Цвет</div>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c} type="button"
              onClick={() => setValue('color', c, { shouldValidate: true })}
              aria-label={`Цвет ${c}`}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-transform',
                color.toLowerCase() === c.toLowerCase() ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {initial && (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" {...register('isActive')} className="rounded text-brand-600 focus:ring-brand-500" />
          Цель активна
        </label>
      )}

      <div className="pt-2">
        <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
          {isLoading ? 'Сохранение…' : initial ? 'Сохранить' : 'Создать цель'}
        </Button>
      </div>
    </form>
  );
}

export default function GoalsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);

  const { data, isLoading, isError, refetch } = useGoals();
  const createMut = useCreateGoal();
  const updateMut = useUpdateGoal();
  const deleteMut = useDeleteGoal();

  const goals = data ?? [];
  const active = goals.filter(g => g.isActive);
  const archived = goals.filter(g => !g.isActive);
  const totalTarget = active.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalCurrent = active.reduce((s, g) => s + Number(g.currentAmount), 0);
  const overall = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const handleCreate = async (d: CreateGoalInput) => {
    await createMut.mutateAsync(d);
    setShowForm(false);
  };
  const handleUpdate = async (d: CreateGoalInput) => {
    if (!editGoal) return;
    await updateMut.mutateAsync({ id: editGoal.id, ...d });
    setEditGoal(null);
  };
  const handleDelete = async () => {
    if (!deleteGoal) return;
    await deleteMut.mutateAsync(deleteGoal.id);
    setDeleteGoal(null);
  };

  if (isLoading) {
    return (
      <div className="p-7 lg:p-9 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }
  if (isError) {
    return <div className="p-7"><QueryError message="Не удалось загрузить цели" onRetry={() => void refetch()} /></div>;
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9 space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">
            {active.length} {active.length === 1 ? 'активная цель' : active.length < 5 ? 'активные цели' : 'активных целей'}
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-gray-900 dark:text-gray-100">Цели накопления</h1>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>+ Новая цель</Button>
      </div>

      {/* Overall hero card */}
      {active.length > 0 && (
        <div className="rounded-2xl p-5 shadow-soft bg-[#EEEBFB] dark:bg-[#1B1B30] flex items-center gap-5">
          <Dial pct={overall} color={ACCENT} size={104} />
          <div className="flex-1">
            <div className="text-[13px] font-medium text-gray-600 dark:text-gray-400 mb-1">Общий прогресс</div>
            <div className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums text-brand-600 dark:text-brand-400">
              {formatMoney(totalCurrent.toFixed(2))}
              <span className="text-base font-normal text-gray-500 dark:text-gray-400"> из {formatMoney(totalTarget.toFixed(2))}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              По {active.length} {active.length === 1 ? 'цели' : 'целям'}
            </div>
          </div>
        </div>
      )}

      {/* Active goals */}
      {active.length === 0 ? (
        <Card className="py-16">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <span className="text-5xl mb-3">🎯</span>
            <p className="font-medium text-lg">Целей пока нет</p>
            <p className="text-sm mt-1 mb-4">Поставьте первую — например, «Отпуск 2026»</p>
            <Button variant="primary" onClick={() => setShowForm(true)}>Создать цель</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {active.map(g => (
            <GoalCard key={g.id} g={g} onEdit={setEditGoal} onDelete={setDeleteGoal} />
          ))}
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <div className="pt-2 space-y-3">
          <h2 className="text-[15px] font-semibold text-gray-500 dark:text-gray-400">Архив</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-70">
            {archived.map(g => (
              <GoalCard key={g.id} g={g} onEdit={setEditGoal} onDelete={setDeleteGoal} />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Новая цель">
        <GoalForm onSubmit={handleCreate} isLoading={createMut.isPending} />
      </Modal>
      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title="Редактировать цель">
        {editGoal && <GoalForm initial={editGoal} onSubmit={handleUpdate} isLoading={updateMut.isPending} />}
      </Modal>
      <Modal open={!!deleteGoal} onClose={() => setDeleteGoal(null)} title="Удалить цель">
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Удалить цель <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteGoal?.name}</span>?
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteGoal(null)}>Отмена</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Удаление…' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
