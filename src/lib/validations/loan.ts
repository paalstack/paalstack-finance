import { z } from 'zod';

export const loanTypeValues = [
  'personal',
  'home',
  'auto',
  'education',
  'credit_card',
  'others',
] as const;

export const loanStatusValues = ['active', 'closed', 'defaulted', 'foreclosed'] as const;

export const loanPaymentStatusValues = ['pending', 'paid', 'late', 'missed'] as const;

export const createLoanSchema = z.object({
  lender: z.string().min(1, 'Lender name is required').max(200),
  type: z.enum(loanTypeValues).default('personal'),
  principal: z.coerce.number().positive('Principal must be positive'),
  interestRate: z.coerce.number().min(0, 'Interest rate must be non-negative'),
  emiAmount: z.coerce.number().positive('EMI amount must be positive'),
  tenureMonths: z.coerce.number().int().positive('Tenure must be a positive integer'),
  startDate: z.string().date('Invalid start date'),
  dueDate: z.string().date('Invalid due date'),
  remainingBalance: z.coerce.number().min(0, 'Remaining balance must be non-negative'),
  currency: z.string().length(3).default('INR'),
  accountId: z.string().uuid('Invalid account').optional(),
  familyId: z.string().uuid('Invalid family').optional(),
  notes: z.string().max(500).optional(),
});

export const updateLoanSchema = createLoanSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(loanStatusValues).optional(),
});

export const createLoanPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  principalComponent: z.coerce.number().min(0).default(0),
  interestComponent: z.coerce.number().min(0).default(0),
  lateFee: z.coerce.number().min(0).default(0),
  paymentDate: z.string().date('Invalid payment date'),
  status: z.enum(loanPaymentStatusValues).default('pending'),
  notes: z.string().max(500).optional(),
  postTransaction: z.boolean().default(false),
});

export const updateLoanPaymentSchema = createLoanPaymentSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;
export type CreateLoanPaymentInput = z.infer<typeof createLoanPaymentSchema>;
export type UpdateLoanPaymentInput = z.infer<typeof updateLoanPaymentSchema>;
export type LoanTypeValue = (typeof loanTypeValues)[number];
export type LoanStatusValue = (typeof loanStatusValues)[number];
export type LoanPaymentStatusValue = (typeof loanPaymentStatusValues)[number];
