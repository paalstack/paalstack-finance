import { z } from 'zod';

export const transactionTypeValues = ['income', 'expense', 'transfer'] as const;
export const transactionStatusValues = ['pending', 'completed', 'cancelled'] as const;

export const createTransactionSchema = z
  .object({
    accountId: z.string().uuid('Invalid account'),
    categoryId: z.string().uuid('Invalid category').optional(),
    toAccountId: z.string().uuid('Invalid destination account').optional(),
    familyId: z.string().uuid('Invalid family').optional(),
    type: z.enum(transactionTypeValues),
    status: z.enum(transactionStatusValues).default('completed'),
    amount: z.coerce
      .number()
      .positive('Amount must be positive')
      .multipleOf(0.01, 'Max 2 decimal places'),
    currency: z.string().length(3).default('INR'),
    description: z.string().max(255).optional(),
    notes: z.string().max(1000).optional(),
    date: z.string().date('Invalid date'),
    isRecurring: z.boolean().default(false),
    tags: z.array(z.string().max(50)).max(10).default([]),
  })
  .refine(
    (data) => {
      if (data.type === 'transfer') {
        return !!data.toAccountId && data.toAccountId !== data.accountId;
      }
      return true;
    },
    { message: 'Transfer requires a different destination account', path: ['toAccountId'] }
  );

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  id: z.string().uuid(),
});

export const transactionFilterSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(transactionTypeValues).optional(),
  status: z.enum(transactionStatusValues).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  search: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
