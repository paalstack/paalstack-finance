import { apiError, apiSuccess } from '@/lib/api';
import { requireAuth } from '@/lib/auth/session';
import { createPortalSession, isBillingEnabled } from '@/lib/billing';
import { ExternalServiceError, UnauthorizedError } from '@/lib/utils/error';

/**
 * Opens the Stripe-hosted billing portal (invoices, payment method, plan
 * changes). Not part of the original §13 contract but standard Stripe
 * practice — kept alongside checkout/cancel rather than reimplementing
 * portal-equivalent UI ourselves.
 */
export const POST = async () => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) throw new UnauthorizedError();

    if (!isBillingEnabled()) {
      throw new ExternalServiceError('Stripe', 'Billing is not configured');
    }

    const { portalUrl } = await createPortalSession(user.id);
    return apiSuccess({ portalUrl });
  } catch (err) {
    return apiError(err);
  }
};
