import { z } from 'zod';

export const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0.00'),
  currency: z.string().length(3).default('RUB'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sourceAccountId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

export const updateGoalSchema = createGoalSchema.partial();
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
