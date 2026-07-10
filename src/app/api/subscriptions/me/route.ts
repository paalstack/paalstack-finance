import { apiError, apiSuccess } from '@/lib/api';
import { requireAuth } from '@/lib/auth/session';
import { getOrCreateSubscription } from '@/lib/billing';
import { UnauthorizedError } from '@/lib/utils/error';

/** Per `docs/API_CONTRACT.md` §13.1 — provider fields are server-only and intentionally omitted. */
export const GET = async () => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) throw new UnauthorizedError();

    const subscription = await getOrCreateSubscription(user.id);

    return apiSuccess({
      id: subscription.id,
      userId: subscription.userId,
      familyId: subscription.familyId,
      plan: subscription.plan,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      priceAmount: Number(subscription.priceAmount),
      currency: subscription.currency,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEndsAt: subscription.trialEndsAt,
      canceledAt: subscription.canceledAt,
    });
  } catch (err) {
    return apiError(err);
  }
};
