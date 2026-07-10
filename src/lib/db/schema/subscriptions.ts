import {
  boolean,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { families } from './families';
import { profiles } from './profiles';

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'free',
  'pro',
  'family',
  'enterprise',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'trialing',
  'past_due',
  'cancelled',
  'expired',
]);

export const subscriptionBillingCycleEnum = pgEnum('subscription_billing_cycle', [
  'monthly',
  'yearly',
]);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').references(() => families.id, { onDelete: 'set null' }),
    plan: subscriptionPlanEnum('plan').notNull().default('free'),
    status: subscriptionStatusEnum('status').notNull().default('active'),
    billingCycle: subscriptionBillingCycleEnum('billing_cycle').notNull().default('monthly'),
    provider: text('provider'),
    providerCustomerId: text('provider_customer_id'),
    providerSubscriptionId: text('provider_subscription_id'),
    priceAmount: numeric('price_amount', { precision: 10, scale: 2 }).notNull().default('0'),
    currency: text('currency').notNull().default('INR'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('subscriptions_user_id_idx').on(table.userId),
    index('subscriptions_family_id_idx').on(table.familyId),
    index('subscriptions_status_idx').on(table.status),
    uniqueIndex('subscriptions_provider_subscription_id_idx').on(table.providerSubscriptionId),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionPlan = (typeof subscriptionPlanEnum.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
export type SubscriptionBillingCycle = (typeof subscriptionBillingCycleEnum.enumValues)[number];
