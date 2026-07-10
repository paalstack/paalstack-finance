import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { ExternalServiceError, ValidationError } from '@/lib/utils/error';

import { getPriceId, type PaidPlan } from './plans';
import { getStripeClient } from './stripe-client';
import { getOrCreateSubscription } from './subscriptions';

import type { SubscriptionBillingCycle } from '@/lib/db/schema/subscriptions';

/**
 * Creates a Stripe Checkout Session for a self-serve plan upgrade.
 * `client_reference_id`/subscription metadata carry `userId` through to the
 * webhook, which is the only place the local `subscriptions` row is written
 * back — Checkout success alone doesn't grant access.
 */
export const createCheckoutSession = async (
  userId: string,
  plan: PaidPlan,
  billingCycle: SubscriptionBillingCycle
): Promise<{ checkoutUrl: string }> => {
  const stripe = getStripeClient();
  const priceId = getPriceId(plan, billingCycle);

  const [existingSubscription, profile] = await Promise.all([
    getOrCreateSubscription(userId),
    db.query.profiles.findFirst({ where: eq(profiles.id, userId) }),
  ]);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    ...(existingSubscription.providerCustomerId
      ? { customer: existingSubscription.providerCustomerId }
      : { customer_email: profile?.email ?? undefined }),
    client_reference_id: userId,
    subscription_data: { metadata: { userId, plan, billingCycle } },
    metadata: { userId, plan, billingCycle },
    success_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new ExternalServiceError('Stripe', 'Checkout session created without a redirect URL');
  }
  return { checkoutUrl: session.url };
};

/** Opens the Stripe-hosted billing portal (invoices, payment methods, plan changes) for an existing customer. */
export const createPortalSession = async (userId: string): Promise<{ portalUrl: string }> => {
  const stripe = getStripeClient();
  const subscription = await getOrCreateSubscription(userId);

  if (!subscription.providerCustomerId) {
    throw new ValidationError('No billing account yet — subscribe to a paid plan first.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.providerCustomerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return { portalUrl: session.url };
};
