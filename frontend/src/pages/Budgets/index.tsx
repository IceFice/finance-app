import { useState } from 'react';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, Budget } from '../../hooks/useBudgets';
import { useCategories } from '../../hooks/useReports';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatMoney } from '../../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays, endOfMonth } from 'date-fns';

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
  if (endDate) {
    return differenceInDays(new Date(endDate), new Date());
  }
  if (period === 'monthly') {
    return differenceInDays(endOfMonth(new Date()), new Date());
  }
  return 0;
}


function BudgetCard({
  budget,
  onDelete,
  onEdit,
}: {
  budget: Budget;
  onDelete: (id: string) => void;
  onEdit: (budget: Budget) => void;
}) {
  const spent = parseFloat(budget.spent ?? '0');
  const limit = parseFloat(budget.amount);
  const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const remaining = limit - spent;
  const days = daysRemaining(budget.period, budget.endDate ?? undefined);

  const dailyRate = days > 0 ? spent / Math.max(1, differenceInDays(new Date(), new Date(budget.startDate))) : 0;
  const projected = days > 0 ? spent + dailyRate * days : spent;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: budget.categoryColor ? budget.categoryColor + '33' : '#6b728033' }}
          >
            💰
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{budget.name}</h3>
            {budget.categoryName && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{budget.categoryName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">{PERIOD_LABELS[budget.period]}</Badge>
          <button
            onClick={() => onEdit(budget)}
            className="text-gray-400 hover:text-blue-500 transition-colors p-1"
            title="Редактировать"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Удалить"
          >
            🗑
          </button>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-300">
            Потрачено: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(budget.spent ?? '0', budget.currency)}</span>
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            из {formatMoney(budget.amount, budget.currency)}
          </span>
        </div>
        <ProgressBar value={percent} />
        <div className="flex justify-between mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className={percent >= 100 ? 'text-red-500 font-medium' : percent >= 80 ? 'text-yellow-500 font-medium' : ''}>
            {percent}% использовано
          </span>
          <span>{remaining > 0 ? `Остаток: ${formatMoney(remaining.toFixed(2), budget.currency)}` : 'Лимит превышен'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Осталось дней</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{days > 0 ? days : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Прогноз</p>
          <p className={`text-sm font-medium ${projected > limit ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
            {formatMoney(projected.toFixed(2), budget.currency)}
          </p>
        </div>
      </div>
    </Card>
  );
}

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
        <input
          id="budget-name"
          {...register('name')}
          type="text"
          placeholder="Например: Продукты на март"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="budget-categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Категория</label>
        <select
          id="budget-categoryId"
          {...register('categoryId')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все категории</option>
          {categories
            .filter((c) => c.type === 'expense')
            .map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="budget-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Лимит</label>
          <input
            id="budget-amount"
            {...register('amount')}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Валюта</label>
          <select
            {...register('currency')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="RUB">RUB</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Период</label>
        <select
          {...register('period')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="weekly">Недельный</option>
          <option value="monthly">Месячный</option>
          <option value="yearly">Годовой</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Начало</label>
          <input
            {...register('startDate')}
            type="date"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Конец (необяз.)</label>
          <input
            {...register('endDate')}
            type="date"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : initial ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}

export default function BudgetsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: budgetsData, isLoading, isError } = useBudgets();
  const { data: categoriesData } = useCategories();

  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const budgets = budgetsData ?? [];
  const categories = (categoriesData as Array<{ id: string; name: string; type: string }>) ?? [];

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

  const activeBudgets = budgets.filter((b) => b.isActive);
  const overBudget = activeBudgets.filter((b) => {
    const spent = parseFloat(b.spent ?? '0');
    const limit = parseFloat(b.amount);
    return spent >= limit;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Бюджеты</h1>
          {overBudget.length > 0 && (
            <p className="text-sm text-red-500 mt-1">
              {overBudget.length} {overBudget.length === 1 ? 'бюджет превышен' : 'бюджета превышены'}
            </p>
          )}
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          + Новый бюджет
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <Card className="py-16">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-3">⚠️</span>
            <p className="font-medium">Ошибка загрузки бюджетов</p>
          </div>
        </Card>
      ) : activeBudgets.length === 0 ? (
        <Card className="py-16">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <span className="text-5xl mb-3">📊</span>
            <p className="font-medium text-lg">Бюджеты не созданы</p>
            <p className="text-sm mt-1 mb-4">Создайте первый бюджет для контроля расходов</p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Создать бюджет
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onDelete={setDeleteId}
              onEdit={setEditBudget}
            />
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
