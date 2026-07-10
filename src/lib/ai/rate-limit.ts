import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { checkRateLimit, type RateLimitResult } from '@/lib/utils/rate-limit';

import type { SubscriptionPlan } from '@/lib/db/schema/subscriptions';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Per-plan daily AI chat message caps — the cost-control mechanism for the
 * assistant. `free` intentionally stays low since every message triggers a
 * real LLM call (and often several tool-augmented ones).
 */
const AI_DAILY_MESSAGE_LIMITS: Record<SubscriptionPlan, number> = {
  free: 20,
  pro: 200,
  family: 200,
  enterprise: 1000,
};

/**
 * Rate-limits AI chat messages per user, tiered by their active
 * subscription plan (defaults to `free` when no active subscription row
 * exists). Shares the in-memory sliding-window limiter used for auth flows —
 * inherits the same single-instance limitation (see `lib/utils/rate-limit.ts`).
 */
export const checkAiChatRateLimit = async (userId: string): Promise<RateLimitResult> => {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    columns: { plan: true, status: true },
  });

  const plan: SubscriptionPlan = subscription?.status === 'active' ? subscription.plan : 'free';

  return checkRateLimit(`ai-chat:${userId}`, AI_DAILY_MESSAGE_LIMITS[plan], DAY_MS);
};
