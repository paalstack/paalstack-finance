import { z } from 'zod';

export const budgetPeriodValues = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'] as const;

export const createBudgetSchema = z
  .object({
    categoryId: z.string().uuid('Invalid category').optional(),
    familyId: z.string().uuid('Invalid family').optional(),
    name: z.string().min(1, 'Budget name is required').max(100),
    amount: z.coerce.number().positive('Budget amount must be positive'),
    currency: z.string().length(3).default('INR'),
    period: z.enum(budgetPeriodValues).default('monthly'),
    startDate: z.string().datetime({ offset: true }),
    endDate: z.string().datetime({ offset: true }).optional(),
    rollover: z.boolean().default(false),
    alertThreshold: z.coerce.number().min(0).max(100).default(80),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.period === 'custom') {
        return !!data.endDate;
      }
      return true;
    },
    { message: 'End date required for custom period', path: ['endDate'] }
  );

export const updateBudgetSchema = createBudgetSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
