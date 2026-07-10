import { captureServerEvent } from '@/lib/analytics/posthog-server';
import { logger } from '@/lib/utils/logger';

import { resolvePlanFromPriceId } from './plans';
import {
  revertSubscriptionToFree,
  upsertSubscriptionFromStripe,
  type StripeSubscriptionSnapshot,
} from './subscriptions';

import type { SubscriptionStatus } from '@/lib/db/schema/subscriptions';
import type Stripe from 'stripe';

/** Maps Stripe's subscription status vocabulary onto our narrower local enum. */
const mapStatus = (status: Stripe.Subscription.Status): SubscriptionStatus => {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'incomplete_expired':
      return 'expired';
    case 'incomplete':
      return 'past_due';
    default: {
      const unknownStatus: string = status;
      logger.warn('[billing/webhook] Unmapped Stripe subscription status', {
        status: unknownStatus,
      });
      return 'past_due';
    }
  }
};

const resolveCustomerId = (customer: Stripe.Subscription['customer']): string =>
  typeof customer === 'string' ? customer : customer.id;

/**
 * Metadata (set at Checkout time via `subscription_data.metadata`) is the
 * primary way we tie a Stripe subscription back to a local user — Stripe has
 * no concept of our `userId` otherwise.
 */
const resolveUserId = (subscription: Stripe.Subscription): string | null =>
  subscription.metadata.userId ?? null;

const buildSnapshot = (
  userId: string,
  subscription: Stripe.Subscription
): StripeSubscriptionSnapshot | null => {
  const item = subscription.items.data[0];
  if (!item) return null;

  const resolved = resolvePlanFromPriceId(item.price.id);
  if (!resolved) {
    logger.warn('[billing/webhook] Subscription price does not match any known plan', {
      priceId: item.price.id,
    });
    return null;
  }

  return {
    userId,
    plan: resolved.plan,
    billingCycle: resolved.billingCycle,
    status: mapStatus(subscription.status),
    providerCustomerId: resolveCustomerId(subscription.customer),
    providerSubscriptionId: subscription.id,
    priceAmount: (item.price.unit_amount ?? 0) / 100,
    currency: item.price.currency.toUpperCase(),
    currentPeriodStart: new Date(item.current_period_start * 1000),
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
  };
};

const handleSubscriptionUpserted = async (subscription: Stripe.Subscription): Promise<void> => {
  const userId = resolveUserId(subscription);
  if (!userId) {
    logger.error('[billing/webhook] Subscription event without a resolvable userId', {
      subscriptionId: subscription.id,
    });
    return;
  }

  const snapshot = buildSnapshot(userId, subscription);
  if (!snapshot) return;

  await upsertSubscriptionFromStripe(snapshot);
};

const handleSubscriptionDeleted = async (subscription: Stripe.Subscription): Promise<void> => {
  const userId = resolveUserId(subscription);
  if (!userId) return;

  await revertSubscriptionToFree(userId);
  captureServerEvent(userId, 'subscription_cancelled', {
    plan: subscription.metadata.plan ?? 'unknown',
  });
};

/**
 * Dispatches a verified Stripe webhook event. Subscription lifecycle events
 * (`customer.subscription.*`) carry the full subscription object — Checkout
 * completion alone doesn't grant access, only the resulting subscription
 * event does, which is more reliable than trusting the client-side redirect.
 */
export const handleStripeWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpserted(event.data.object);
      return;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      return;
    default:
      logger.debug(`[billing/webhook] Ignoring unhandled event type: ${event.type}`);
  }
};
