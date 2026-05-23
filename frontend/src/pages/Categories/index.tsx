// ════════════════════════════════════════════════════════════════════════════
// Категории — CRUD страница
// Backend exposes /categories with system (user_id IS NULL, read-only) + own
// custom rows. Page groups by type (income/expense), system cards are visually
// muted with a lock badge, custom cards have edit/delete actions.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCategoriesCrud, useCreateCategory, useUpdateCategory, useDeleteCategory, Category,
} from '@/hooks/useCategories';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { QueryError } from '@/components/ui/QueryError';
import { cn } from '@/lib/utils';

const DEFAULT_COLORS = [
  '#F59E0B', '#22C55E', '#EF4444', '#EC4899', '#0EA5E9', '#A855F7',
  '#10B981', '#6366F1', '#14B8A6', '#3B82F6', '#F43F5E', '#8B5CF6',
];

const schema = z.object({
  name: z.string().min(1, 'Укажите название').max(100, 'Максимум 100 символов'),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Цвет в формате #RRGGBB'),
  icon: z.string().max(50).optional(),
});
type FormData = z.infer<typeof schema>;

function CategoryForm({
  initial, onSubmit, isLoading,
}: { initial?: Category; onSubmit: (d: FormData) => Promise<void>; isLoading: boolean }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { name: initial.name, type: initial.type, color: initial.color ?? '#6366F1', icon: initial.icon ?? '' }
      : { type: 'expense', color: '#6366F1', icon: '' },
  });
  const color = watch('color');
  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
      <div>
        <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
        <input id="cat-name" {...register('name')} type="text" placeholder="Например: Кафе" className={inputCls} />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="cat-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
          <select id="cat-type" {...register('type')} className={inputCls}>
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </select>
        </div>
        <div>
          <label htmlFor="cat-icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Иконка <span className="text-gray-400 text-xs font-normal">эмодзи</span>
          </label>
          <input id="cat-icon" {...register('icon')} type="text" maxLength={50} placeholder="🍔" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Цвет</label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COLORS.map(c => (
            <button
              key={c} type="button"
              onClick={() => setValue('color', c, { shouldValidate: true })}
              aria-label={`Выбрать цвет ${c}`}
              className={cn(
                'w-9 h-9 rounded-full border-2 transition-transform',
                color?.toLowerCase() === c.toLowerCase()
                  ? 'border-gray-900 dark:border-white scale-110'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <input
          {...register('color')} type="color"
          aria-label="Свой цвет"
          className="mt-3 h-10 w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1 cursor-pointer"
        />
        {errors.color && <p className="mt-1 text-xs text-red-500">{errors.color.message}</p>}
      </div>
      <div className="pt-2">
        <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
          {isLoading ? 'Сохранение…' : initial ? 'Сохранить' : 'Создать категорию'}
        </Button>
      </div>
    </form>
  );
}

function CategoryCard({
  cat, onEdit, onDelete,
}: { cat: Category; onEdit: (c: Category) => void; onDelete: (c: Category) => void }) {
  const color = cat.color || '#9CA3AF';
  return (
    <div className="rounded-xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] p-4 flex items-center gap-3 group">
      <span
        className="w-11 h-11 rounded-xl grid place-items-center text-lg flex-shrink-0"
        style={{ backgroundColor: color + '22', color }}
      >
        {cat.icon || (cat.type === 'income' ? '💰' : '💸')}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">{cat.name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {cat.isSystem ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true">🔒</span> Системная
            </span>
          ) : 'Своя'}
        </div>
      </div>
      {!cat.isSystem && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(cat)}
            aria-label={`Редактировать ${cat.name}`}
            className="w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDelete(cat)}
            aria-label={`Удалить ${cat.name}`}
            className="w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            🗑
          </button>
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const { data, isLoading, isError, refetch } = useCategoriesCrud();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();

  const all = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(
    () => filterType === 'all' ? all : all.filter(c => c.type === filterType),
    [all, filterType],
  );
  const income = filtered.filter(c => c.type === 'income');
  const expense = filtered.filter(c => c.type === 'expense');
  const customCount = all.filter(c => !c.isSystem).length;
  const systemCount = all.filter(c => c.isSystem).length;

  const handleCreate = async (d: FormData) => {
    await createMut.mutateAsync(d);
    setShowForm(false);
  };
  const handleUpdate = async (d: FormData) => {
    if (!editCat) return;
    await updateMut.mutateAsync({ id: editCat.id, ...d });
    setEditCat(null);
  };
  const handleDelete = async () => {
    if (!deleteCat) return;
    await deleteMut.mutateAsync(deleteCat.id);
    setDeleteCat(null);
  };

  if (isLoading) {
    return (
      <div className="p-5 sm:p-7 lg:p-9 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }
  if (isError) {
    return <div className="p-7"><QueryError message="Не удалось загрузить категории" onRetry={() => void refetch()} /></div>;
  }

  const filters: Array<{ value: typeof filterType; label: string; count: number }> = [
    { value: 'all',     label: 'Все',     count: all.length },
    { value: 'expense', label: 'Расход',  count: all.filter(c => c.type === 'expense').length },
    { value: 'income',  label: 'Доход',   count: all.filter(c => c.type === 'income').length },
  ];

  return (
    <div className="p-5 sm:p-7 lg:p-9 space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">
            {systemCount} системных + {customCount} своих
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-gray-900 dark:text-gray-100">Категории</h1>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>+ Новая категория</Button>
      </div>

      {/* Type filter pills */}
      <div className="inline-flex items-center bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] rounded-full p-1 gap-1">
        {filters.map(f => {
          const active = f.value === filterType;
          return (
            <button
              key={f.value} type="button"
              onClick={() => setFilterType(f.value)}
              className={cn(
                'px-3.5 h-8 rounded-full text-sm transition-colors inline-flex items-center gap-1.5',
                active
                  ? 'bg-brand-600 text-white font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
              )}
            >
              {f.label}
              <span className={cn('text-[11px] tabular-nums', active ? 'text-white/80' : 'text-gray-400')}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Two sections — Расход + Доход — when "all" filter; one section otherwise */}
      {filterType !== 'income' && expense.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="text-expense">●</span> Расходы
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">{expense.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expense.map(c => (
              <CategoryCard key={c.id} cat={c} onEdit={setEditCat} onDelete={setDeleteCat} />
            ))}
          </div>
        </Card>
      )}
      {filterType !== 'expense' && income.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="text-income">●</span> Доходы
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">{income.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {income.map(c => (
              <CategoryCard key={c.id} cat={c} onEdit={setEditCat} onDelete={setDeleteCat} />
            ))}
          </div>
        </Card>
      )}

      {filtered.length === 0 && (
        <Card className="py-16">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <span className="text-5xl mb-3">🏷️</span>
            <p className="font-medium text-lg">Категорий ещё нет</p>
            <p className="text-sm mt-1 mb-4">Создайте первую, чтобы группировать операции</p>
            <Button variant="primary" onClick={() => setShowForm(true)}>Создать категорию</Button>
          </div>
        </Card>
      )}

      {/* Modals */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Новая категория">
        <CategoryForm onSubmit={handleCreate} isLoading={createMut.isPending} />
      </Modal>
      <Modal open={!!editCat} onClose={() => setEditCat(null)} title="Редактировать категорию">
        {editCat && (
          <CategoryForm initial={editCat} onSubmit={handleUpdate} isLoading={updateMut.isPending} />
        )}
      </Modal>
      <Modal open={!!deleteCat} onClose={() => setDeleteCat(null)} title="Удалить категорию">
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Удалить категорию <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteCat?.name}</span>?
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Операции с этой категорией останутся, но потеряют связь — категория сменится на «Без категории».
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteCat(null)}>Отмена</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Удаление…' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
