import { env } from '@/lib/env';
import { ExternalServiceError } from '@/lib/utils/error';

import type { SubscriptionBillingCycle, SubscriptionPlan } from '@/lib/db/schema/subscriptions';

export * from './plan-display';

/** Plans purchasable via self-serve Stripe Checkout (`enterprise` is sales-assisted). */
export type PaidPlan = Exclude<SubscriptionPlan, 'free'>;

type PriceIdsByCycle = Record<SubscriptionBillingCycle, string | undefined>;

const PLAN_PRICE_IDS: Record<PaidPlan, PriceIdsByCycle> = {
  pro: { monthly: env.STRIPE_PRICE_PRO_MONTHLY, yearly: env.STRIPE_PRICE_PRO_YEARLY },
  family: { monthly: env.STRIPE_PRICE_FAMILY_MONTHLY, yearly: env.STRIPE_PRICE_FAMILY_YEARLY },
  enterprise: { monthly: undefined, yearly: undefined },
};

export const getPriceId = (plan: PaidPlan, billingCycle: SubscriptionBillingCycle): string => {
  const priceId = PLAN_PRICE_IDS[plan][billingCycle];
  if (!priceId) {
    throw new ExternalServiceError(
      'Stripe',
      `No price is configured for ${plan}/${billingCycle}. Set the matching STRIPE_PRICE_* env var.`
    );
  }
  return priceId;
};

/** Reverse lookup used by the webhook handler to map a Stripe price back onto our plan model. */
export const resolvePlanFromPriceId = (
  priceId: string
): { plan: PaidPlan; billingCycle: SubscriptionBillingCycle } | null => {
  for (const plan of Object.keys(PLAN_PRICE_IDS) as PaidPlan[]) {
    for (const billingCycle of Object.keys(PLAN_PRICE_IDS[plan]) as SubscriptionBillingCycle[]) {
      if (PLAN_PRICE_IDS[plan][billingCycle] === priceId) return { plan, billingCycle };
    }
  }
  return null;
};
