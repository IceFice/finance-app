import { z } from 'zod';

export const createBudgetSchema = z.object({
  name: z.string().min(1).max(100),
  categoryId: z.string().uuid().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default('RUB'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateBudgetSchema = createBudgetSchema.partial();
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
