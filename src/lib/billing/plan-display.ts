import type { SubscriptionPlan } from '@/lib/db/schema/subscriptions';

/**
 * Client-safe plan display metadata — deliberately has zero imports besides
 * types, so it can be imported directly from Client Components (the billing
 * settings page) without dragging in `@/lib/env`/`stripe`/`db`, which the
 * rest of `lib/billing` depends on and which are not safe to bundle into the
 * browser. Prices are indicative (INR/month); Stripe is the source of truth.
 */
export const PLAN_DISPLAY: Record<
  SubscriptionPlan,
  { name: string; description: string; priceMonthly: number | null; features: string[] }
> = {
  free: {
    name: 'Free',
    description: 'Manual tracking to get started',
    priceMonthly: 0,
    features: ['1 account', 'Manual transactions', 'Basic budgets', '20 AI messages/day'],
  },
  pro: {
    name: 'Pro',
    description: 'Full AI assistant and unlimited tracking',
    priceMonthly: 299,
    features: ['Unlimited accounts', 'Full AI assistant', 'Budget alerts', '200 AI messages/day'],
  },
  family: {
    name: 'Family',
    description: 'Everything in Pro, shared with your household',
    priceMonthly: 499,
    features: [
      'Everything in Pro',
      'Up to 6 members',
      'Shared budgets & accounts',
      '200 AI messages/day',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Custom limits and dedicated support',
    priceMonthly: null,
    features: ['Custom limits', 'Priority support', 'SSO (coming soon)', '1000 AI messages/day'],
  },
};
