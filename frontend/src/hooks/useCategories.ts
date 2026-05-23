// Categories CRUD hooks. Backend already exposes GET/POST/PATCH/DELETE
// /categories with RLS (system rows are read-only, user rows are owned).
//
// Note: there's a `useCategories` re-export in useReports.ts kept for
// backwards compat with the Transactions filter UI — this file is the
// canonical home and adds the missing mutations.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
  icon: string | null;
  isSystem: boolean;
  sortOrder: number;
}

export interface CreateCategoryInput {
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  sortOrder?: number;
}
export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export function useCategoriesCrud() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data.data,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryInput) => api.post('/categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCategoryInput & { id: string }) =>
      api.patch(`/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
