import { z } from 'zod';

export const recurringFrequencyValues = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'yearly',
] as const;

export const createRecurringTransactionSchema = z
  .object({
    accountId: z.string().uuid('Invalid account'),
    categoryId: z.string().uuid('Invalid category').optional(),
    toAccountId: z.string().uuid('Invalid destination account').optional(),
    type: z.enum(['income', 'expense', 'transfer'] as const),
    amount: z.coerce
      .number()
      .positive('Amount must be positive')
      .multipleOf(0.01, 'Max 2 decimal places'),
    currency: z.string().length(3).default('INR'),
    notes: z.string().max(1000).optional(),
    frequency: z.enum(recurringFrequencyValues).default('monthly'),
    startDate: z.string().date('Invalid start date'),
    endDate: z.string().date('Invalid end date').optional(),
    autoPost: z.boolean().default(true),
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

export const updateRecurringTransactionSchema = createRecurringTransactionSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionSchema>;
export type UpdateRecurringTransactionInput = z.infer<typeof updateRecurringTransactionSchema>;
export type RecurringFrequencyValue = (typeof recurringFrequencyValues)[number];
