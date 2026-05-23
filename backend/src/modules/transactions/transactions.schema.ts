import { z } from 'zod';

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default('RUB'),
  exchangeRate: z.string().regex(/^\d+(\.\d{1,6})?$/).default('1.000000'),
  type: z.enum(['debit', 'credit', 'transfer']),
  description: z.string().max(500).optional(),
  merchant: z.string().max(255).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// Per-row schema for bulk import — same as create but transfer is not allowed
// (transfers are linked pairs that need a separate flow). Sensible defaults
// so a minimal CSV without explicit currency/exchangeRate goes through.
export const importRowSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default('RUB'),
  exchangeRate: z.string().regex(/^\d+(\.\d{1,6})?$/).default('1.000000'),
  type: z.enum(['debit', 'credit']),
  description: z.string().max(500).optional(),
  merchant: z.string().max(255).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
});

export const importBulkSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(2000),
  dedupe: z.boolean().default(true),
});

export const createTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default('RUB'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional(),
});

export const listQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['debit', 'credit', 'transfer']).optional(),
  search: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type ImportRowInput = z.infer<typeof importRowSchema>;
export type ImportBulkInput = z.infer<typeof importBulkSchema>;
