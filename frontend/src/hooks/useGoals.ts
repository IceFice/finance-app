import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  manualAmount: string;
  currency: string;
  deadline: string | null;
  sourceAccountId: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  progressPct: number;
  remaining: string;
  daysLeft: number | null;
  onTrack: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  name: string;
  targetAmount: string;
  currentAmount?: string;
  currency?: string;
  deadline?: string | null;
  sourceAccountId?: string | null;
  color?: string;
  icon?: string;
  isActive?: boolean;
}
export type UpdateGoalInput = Partial<CreateGoalInput>;

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => (await api.get('/goals')).data.data,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalInput) => api.post('/goals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateGoalInput & { id: string }) =>
      api.patch(`/goals/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}
