import { z } from 'zod';

export const accountTypeValues = [
  'checking',
  'savings',
  'credit_card',
  'cash',
  'investment',
  'loan',
  'other',
] as const;

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(accountTypeValues),
  balance: z.coerce.number().default(0),
  currency: z.string().length(3).default('INR'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color')
    .default('#6366f1'),
  icon: z.string().default('wallet'),
  isDefault: z.boolean().default(false),
  notes: z.string().max(500).optional(),
  familyId: z.string().uuid().optional(),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
