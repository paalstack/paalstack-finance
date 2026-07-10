import { type NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api';
import { requireAuth } from '@/lib/auth/session';
import { createCheckoutSession, isBillingEnabled } from '@/lib/billing';
import { ExternalServiceError, UnauthorizedError, ValidationError } from '@/lib/utils/error';
import { checkoutRequestSchema } from '@/lib/validations/billing';

/** `docs/API_CONTRACT.md` §13.3 — returns a Stripe Checkout URL for a self-serve plan upgrade. */
export const POST = async (request: NextRequest) => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) throw new UnauthorizedError();

    if (!isBillingEnabled()) {
      throw new ExternalServiceError('Stripe', 'Billing is not configured');
    }

    const body: unknown = await request.json().catch(() => ({}));
    const parsed = checkoutRequestSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError('Invalid checkout request', parsed.error.issues);

    const { checkoutUrl } = await createCheckoutSession(
      user.id,
      parsed.data.plan,
      parsed.data.billingCycle
    );
    return apiSuccess({ checkoutUrl });
  } catch (err) {
    return apiError(err);
  }
};
