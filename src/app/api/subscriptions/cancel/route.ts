import { apiError, apiSuccess } from '@/lib/api';
import { requireAuth } from '@/lib/auth/session';
import {
  getOrCreateSubscription,
  getStripeClient,
  isBillingEnabled,
  setCancelAtPeriodEnd,
} from '@/lib/billing';
import { ExternalServiceError, UnauthorizedError, ValidationError } from '@/lib/utils/error';

/**
 * `docs/API_CONTRACT.md` §13.4 — sets `cancelAtPeriodEnd: true`, does not
 * immediately revoke access. Updates Stripe first, then mirrors the flag
 * locally, so a Stripe failure never leaves the local row out of sync.
 */
export const POST = async () => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) throw new UnauthorizedError();

    if (!isBillingEnabled()) {
      throw new ExternalServiceError('Stripe', 'Billing is not configured');
    }

    const existing = await getOrCreateSubscription(user.id);
    if (!existing.providerSubscriptionId) {
      throw new ValidationError('No active paid subscription to cancel');
    }

    await getStripeClient().subscriptions.update(existing.providerSubscriptionId, {
      cancel_at_period_end: true,
    });
    const subscription = await setCancelAtPeriodEnd(user.id, true);

    return apiSuccess({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
    });
  } catch (err) {
    return apiError(err);
  }
};
