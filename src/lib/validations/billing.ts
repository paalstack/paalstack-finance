import { z } from 'zod';

export const checkoutRequestSchema = z.object({
  plan: z.enum(['pro', 'family']),
  billingCycle: z.enum(['monthly', 'yearly']),
});

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
