import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { DatabaseError, NotFoundError } from '@/lib/utils/error';

import type {
  Subscription,
  SubscriptionBillingCycle,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/lib/db/schema/subscriptions';

/**
 * Returns the caller's subscription, creating an implicit `free` row on
 * first access — mirrors how `profiles` is lazily created in
 * `lib/auth/session.ts` rather than requiring a signup-time job.
 */
export const getOrCreateSubscription = async (userId: string): Promise<Subscription> => {
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  if (existing) return existing;

  const [created] = await db.insert(subscriptions).values({ userId }).returning();
  if (!created) throw new DatabaseError('Failed to initialize subscription');
  return created;
};

export const findSubscriptionByProviderCustomerId = async (
  providerCustomerId: string
): Promise<Subscription | undefined> =>
  db.query.subscriptions.findFirst({
    where: eq(subscriptions.providerCustomerId, providerCustomerId),
  });

export const findSubscriptionByProviderSubscriptionId = async (
  providerSubscriptionId: string
): Promise<Subscription | undefined> =>
  db.query.subscriptions.findFirst({
    where: eq(subscriptions.providerSubscriptionId, providerSubscriptionId),
  });

export const setCancelAtPeriodEnd = async (
  userId: string,
  cancelAtPeriodEnd: boolean
): Promise<Subscription> => {
  const [updated] = await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd, updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId))
    .returning();
  if (!updated) throw new NotFoundError('Subscription');
  return updated;
};

export type StripeSubscriptionSnapshot = {
  userId: string;
  plan: SubscriptionPlan;
  billingCycle: SubscriptionBillingCycle;
  status: SubscriptionStatus;
  providerCustomerId: string;
  providerSubscriptionId: string;
  priceAmount: number;
  currency: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
};

/** Upserts a subscription row from a Stripe webhook event's resolved state. Keyed on `userId` (via Checkout Session metadata). */
export const upsertSubscriptionFromStripe = async (
  snapshot: StripeSubscriptionSnapshot
): Promise<void> => {
  const values = {
    plan: snapshot.plan,
    status: snapshot.status,
    billingCycle: snapshot.billingCycle,
    provider: 'stripe',
    providerCustomerId: snapshot.providerCustomerId,
    providerSubscriptionId: snapshot.providerSubscriptionId,
    priceAmount: snapshot.priceAmount.toString(),
    currency: snapshot.currency,
    currentPeriodStart: snapshot.currentPeriodStart,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    trialEndsAt: snapshot.trialEndsAt,
    canceledAt: snapshot.canceledAt,
    updatedAt: new Date(),
  };

  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, snapshot.userId),
  });

  if (existing) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.userId, snapshot.userId));
  } else {
    await db.insert(subscriptions).values({ userId: snapshot.userId, ...values });
  }
};

/** Downgrades to `free` when Stripe reports the subscription fully deleted (post-cancellation). */
export const revertSubscriptionToFree = async (userId: string): Promise<void> => {
  await db
    .update(subscriptions)
    .set({
      plan: 'free',
      status: 'active',
      cancelAtPeriodEnd: false,
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
};
