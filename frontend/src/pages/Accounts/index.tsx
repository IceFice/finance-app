import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  Account,
} from '../../hooks/useAccounts';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { QueryError } from '../../components/ui/QueryError';
import { formatMoney } from '../../lib/utils';

const ACCOUNT_TYPES = [
  { value: 'checking',    label: 'Текущий счёт' },
  { value: 'savings',     label: 'Накопительный' },
  { value: 'credit_card', label: 'Кредитная карта' },
  { value: 'cash',        label: 'Наличные' },
  { value: 'investment',  label: 'Инвестиции' },
  { value: 'loan',        label: 'Кредит' },
] as const;

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ACCOUNT_TYPES.map((t) => [t.value, t.label])
);
const TYPE_ICON: Record<string, string> = {
  checking: '🏦', savings: '🐖', credit_card: '💳',
  cash: '💵', investment: '📈', loan: '📉',
};

const accountSchema = z.object({
  name: z.string().min(1, 'Укажите название').max(100, 'Максимум 100 символов'),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']),
  currency: z.string().length(3),
  balance: z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Некорректная сумма'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Цвет в формате #RRGGBB')
    .optional()
    .or(z.literal('')),
  icon: z.string().max(50).optional(),
});
type AccountFormData = z.infer<typeof accountSchema>;

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: Account;
  onEdit: (a: Account) => void;
  onDelete: (id: string) => void;
}) {
  const negative = parseFloat(account.balance) < 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: (account.color ?? '#6b7280') + '33' }}
          >
            {account.icon || TYPE_ICON[account.type] || '🏦'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{account.name}</p>
            <Badge>{TYPE_LABEL[account.type] ?? account.type}</Badge>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            type="button"
            aria-label="Редактировать счёт"
            title="Редактировать"
            onClick={() => onEdit(account)}
            className="text-gray-400 hover:text-brand-500 transition-colors p-1 rounded"
          >
            ✎
          </button>
          <button
            type="button"
            aria-label="Удалить счёт"
            title="Удалить"
            onClick={() => onDelete(account.id)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
          >
            🗑
          </button>
        </div>
      </div>
      <p className={`mt-4 text-2xl font-bold ${negative ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
        {formatMoney(account.balance, account.currency)}
      </p>
    </Card>
  );
}

function AccountForm({
  initial,
  onSubmit,
  isLoading,
}: {
  initial?: Account;
  onSubmit: (data: AccountFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          type: initial.type as AccountFormData['type'],
          currency: initial.currency,
          balance: initial.balance,
          color: initial.color ?? '',
          icon: initial.icon ?? '',
        }
      : { type: 'checking', currency: 'RUB', balance: '0.00', color: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
      <div>
        <label htmlFor="acc-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
        <input
          id="acc-name"
          {...register('name')}
          type="text"
          placeholder="Например: Карта Сбербанк"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="acc-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
          <select
            id="acc-type"
            {...register('type')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="acc-currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Валюта</label>
          <select
            id="acc-currency"
            {...register('currency')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="RUB">RUB ₽</option>
            <option value="USD">USD $</option>
            <option value="EUR">EUR €</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="acc-balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {initial ? 'Баланс' : 'Начальный баланс'}
          </label>
          <input
            id="acc-balance"
            {...register('balance')}
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.balance && <p className="mt-1 text-xs text-red-500">{errors.balance.message}</p>}
        </div>
        <div>
          <label htmlFor="acc-icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Иконка (эмодзи)</label>
          <input
            id="acc-icon"
            {...register('icon')}
            type="text"
            maxLength={50}
            placeholder="💳"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="acc-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Цвет</label>
        <input
          id="acc-color"
          {...register('color')}
          type="color"
          className="h-10 w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1 cursor-pointer"
        />
        {errors.color && <p className="mt-1 text-xs text-red-500">{errors.color.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : initial ? 'Сохранить' : 'Создать счёт'}
        </Button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useAccounts();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  const accounts = data ?? [];

  const toPayload = (d: AccountFormData) => ({
    name: d.name,
    type: d.type,
    currency: d.currency,
    balance: d.balance,
    color: d.color ? d.color : undefined,
    icon: d.icon ? d.icon : undefined,
  });

  const handleCreate = async (d: AccountFormData) => {
    await createMutation.mutateAsync(toPayload(d));
    setShowForm(false);
  };

  const handleUpdate = async (d: AccountFormData) => {
    if (!editAccount) return;
    await updateMutation.mutateAsync({ id: editAccount.id, ...toPayload(d) });
    setEditAccount(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Счета</h1>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          + Новый счёт
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <QueryError message="Не удалось загрузить счета" onRetry={() => void refetch()} />
      ) : accounts.length === 0 ? (
        <Card className="py-16">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <span className="text-5xl mb-3">🏦</span>
            <p className="font-medium text-lg">Счетов пока нет</p>
            <p className="text-sm mt-1 mb-4">
              Создайте первый счёт — без него нельзя добавлять операции
            </p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Создать счёт
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={setEditAccount}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Новый счёт">
        <AccountForm onSubmit={handleCreate} isLoading={createMutation.isPending} />
      </Modal>

      <Modal open={!!editAccount} onClose={() => setEditAccount(null)} title="Редактировать счёт">
        {editAccount && (
          <AccountForm
            initial={editAccount}
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Удалить счёт">
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Удалить этот счёт? Операции по нему останутся, но счёт будет скрыт.
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
