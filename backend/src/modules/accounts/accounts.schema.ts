import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']),
  currency: z.string().length(3).default('USD'),
  balance: z.string().regex(/^-?\d+(\.\d{1,2})?$/).default('0.00'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
