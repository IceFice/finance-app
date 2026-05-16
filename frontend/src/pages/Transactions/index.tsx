import { useState, useRef, useEffect, useCallback } from 'react';
import { useTransactions, useDeleteTransaction, useCreateTransaction, useUpdateTransaction, Transaction } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useReports';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { SlideOver } from '../../components/ui/SlideOver';
import { formatMoney, formatDate } from '../../lib/utils';
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <span className={`text-2xl font-bold ${isCredit ? 'text-green-600 dark:text-green-400' : isTransfer ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
          {isCredit ? '+' : isTransfer ? '' : '-'}{formatMoney(tx.amount, tx.currency)}
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

  const loadMoreRef = useRef<HTMLDivElement>(null);

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
  } = useTransactions({
    from: fromDate,
    to: toDate,
    type: txType || undefined,
    search: search || undefined,
    accountId: accountId || undefined,
    categoryId: categoryId || undefined,
  });

  const deleteMutation = useDeleteTransaction();

  const transactions: Transaction[] = data?.pages?.flatMap((p) => p.data) ?? [];

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const resetFilters = () => {
    setFromDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    setToDate(format(new Date(), 'yyyy-MM-dd'));
    setTxType('');
    setSearch('');
    setAccountId('');
    setCategoryId('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Транзакции</h1>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          + Добавить
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">С даты</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">По дату</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Тип</label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все типы</option>
              <option value="debit">Расход</option>
              <option value="credit">Доход</option>
              <option value="transfer">Перевод</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Счёт</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все счета</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Категория</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Поиск</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button variant="ghost" size="sm" onClick={resetFilters} title="Сбросить фильтры">
                ✕
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-700">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-3">⚠️</span>
            <p className="font-medium">Ошибка загрузки транзакций</p>
            <p className="text-sm mt-1">Попробуйте обновить страницу</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <span className="text-5xl mb-3">💳</span>
            <p className="font-medium text-lg">Транзакции не найдены</p>
            <p className="text-sm mt-1">Измените фильтры или добавьте первую транзакцию</p>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
              <div className="col-span-2">Дата</div>
              <div className="col-span-3">Описание</div>
              <div className="col-span-2">Категория</div>
              <div className="col-span-2">Счёт</div>
              <div className="col-span-2 text-right">Сумма</div>
              <div className="col-span-1"></div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                const isTransfer = tx.type === 'transfer';
                return (
                  <div
                    key={tx.id}
                    role="row"
                    className="flex md:grid md:grid-cols-12 gap-3 md:gap-4 items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => setDetailTx(tx)}
                  >
                    {/* Mobile: icon + info */}
                    <div className="flex items-center gap-3 flex-1 md:contents">
                      <div
                        className="w-9 h-9 md:hidden rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                        style={{ backgroundColor: tx.categoryColor ? tx.categoryColor + '33' : '#6b728033' }}
                      >
                        {isCredit ? '💰' : isTransfer ? '🔄' : '💸'}
                      </div>

                      {/* Date */}
                      <div className="hidden md:flex md:col-span-2 items-center text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(tx.date)}
                      </div>

                      {/* Description */}
                      <div className="md:col-span-3 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                          {tx.merchant || tx.description || 'Без описания'}
                        </p>
                        <p className="text-xs text-gray-400 md:hidden">{formatDate(tx.date)}</p>
                        {tx.merchant && tx.description && (
                          <p className="text-xs text-gray-400 hidden md:block truncate">{tx.description}</p>
                        )}
                      </div>

                      {/* Category */}
                      <div className="hidden md:flex md:col-span-2 items-center gap-2">
                        {tx.categoryName ? (
                          <>
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tx.categoryColor || '#6b7280' }}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{tx.categoryName}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </div>

                      {/* Account */}
                      <div className="hidden md:block md:col-span-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{tx.accountName}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-semibold ${isCredit ? 'text-green-600 dark:text-green-400' : isTransfer ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isCredit ? '+' : isTransfer ? '' : '-'}{formatMoney(tx.amount, tx.currency)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(tx.id); }}
                        className="hidden md:block text-gray-400 hover:text-red-500 transition-colors ml-2 p-1 rounded"
                        title="Удалить"
                        aria-label="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              {!hasNextPage && transactions.length > 0 && (
                <span className="text-xs text-gray-400 py-4">Все транзакции загружены</span>
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
