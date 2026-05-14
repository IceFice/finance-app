import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Transaction {
  id: string; accountId: string; categoryId: string | null; amount: string;
  amountBase: string; currency: string; type: string; description: string | null;
  merchant: string | null; date: string; notes: string | null;
  categoryName: string | null; categoryColor: string | null; accountName: string | null;
  transferPairId: string | null; createdAt: string;
}

export interface TransactionFilters {
  from?: string; to?: string; accountId?: string;
  categoryId?: string; type?: string; search?: string;
}

interface Page { data: Transaction[]; pagination: { nextCursor: string | null; hasMore: boolean; limit: number }; }

export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery<Page>({
    queryKey: ['transactions', filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.accountId) params.set('accountId', filters.accountId);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.type) params.set('type', filters.type);
      if (filters.search) params.set('search', filters.search);
      if (pageParam) params.set('cursor', pageParam as string);
      return (await api.get(`/transactions?${params}`)).data;
    },
    getNextPageParam: (last) => last.pagination.hasMore ? last.pagination.nextCursor : undefined,
    initialPageParam: null as string | null,
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['transactions'] });
      const snapshot = qc.getQueriesData({ queryKey: ['transactions'] });
      qc.setQueriesData({ queryKey: ['transactions'] }, (old: unknown) => {
        const data = old as InfiniteData<Page> | undefined;
        if (!data) return old;
        return { ...data, pages: data.pages.map(p => ({ ...p, data: p.data.filter(t => t.id !== id) })) };
      });
      return { snapshot };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.snapshot) {
        ctx.snapshot.forEach(([key, val]) => qc.setQueryData(key, val));
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Transaction> & { accountId: string; amount: string; type: string; date: string }) =>
      api.post('/transactions', data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
