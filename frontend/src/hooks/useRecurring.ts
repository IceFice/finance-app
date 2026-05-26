import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Recurring {
  id: string;
  accountId: string;
  categoryId: string | null;
  amount: string;
  currency: string;
  type: 'debit' | 'credit';
  description: string | null;
  merchant: string | null;
  frequency: Frequency;
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  lastAppliedAt: string | null;
  isActive: boolean;
  accountName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

export interface CreateRecurringInput {
  accountId: string;
  categoryId?: string | null;
  amount: string;
  currency?: string;
  type: 'debit' | 'credit';
  description?: string;
  merchant?: string;
  frequency: Frequency;
  startDate: string;
  endDate?: string | null;
  isActive?: boolean;
}
export type UpdateRecurringInput = Partial<CreateRecurringInput>;

export function useRecurring() {
  return useQuery<Recurring[]>({
    queryKey: ['recurring'],
    queryFn: async () => (await api.get('/recurring')).data.data,
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: CreateRecurringInput) => api.post('/recurring', d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...d }: UpdateRecurringInput & { id: string }) =>
      api.patch(`/recurring/${id}`, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recurring/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useApplyDueRecurring() {
  const qc = useQueryClient();
  return useMutation<{ created: number; rows: string[] }, unknown, void>({
    mutationFn: async () => (await api.post('/recurring/apply')).data.data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recurring'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
