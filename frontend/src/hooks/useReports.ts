import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface DateRange { from: string; to: string; }

export function useReportsMonthlySummary(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'monthly-summary', range],
    queryFn: async () => (await api.get(`/reports/monthly-summary?from=${range.from}&to=${range.to}`)).data.data,
    enabled: !!range.from && !!range.to,
  });
}

export function useReportsSpendingByCategory(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'spending-by-category', range],
    queryFn: async () => (await api.get(`/reports/spending-by-category?from=${range.from}&to=${range.to}`)).data.data,
    enabled: !!range.from && !!range.to,
  });
}

export function useReportsCashFlow(range: DateRange & { granularity?: string }) {
  return useQuery({
    queryKey: ['reports', 'cash-flow', range],
    queryFn: async () => (await api.get(`/reports/cash-flow?from=${range.from}&to=${range.to}&granularity=${range.granularity ?? 'month'}`)).data.data,
    enabled: !!range.from && !!range.to,
  });
}


export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data.data,
  });
}
