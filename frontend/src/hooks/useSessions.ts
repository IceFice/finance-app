import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Session {
  familyId: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  isCurrent: boolean;
}

export function useSessions() {
  return useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get('/auth/sessions')).data.data,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (familyId: string) => api.delete(`/auth/sessions/${familyId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation<{ revoked: number }, unknown, void>({
    mutationFn: async () => (await api.post('/auth/sessions/revoke-others')).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
