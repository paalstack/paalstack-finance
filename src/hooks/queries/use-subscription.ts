import { useQuery } from '@tanstack/react-query';

import type {
  SubscriptionBillingCycle,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/lib/db/schema/subscriptions';
import type { ApiResponse } from '@/types';

export type SubscriptionSummary = {
  id: string;
  userId: string;
  familyId: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: SubscriptionBillingCycle;
  priceAmount: number;
  currency: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  canceledAt: string | null;
};

export const subscriptionQueryKeys = {
  all: ['subscription'] as const,
  mine: () => [...subscriptionQueryKeys.all, 'mine'] as const,
};

const fetchMySubscription = async (): Promise<SubscriptionSummary> => {
  const response = await fetch('/api/subscriptions/me');
  const body = (await response.json()) as ApiResponse<SubscriptionSummary>;
  if (!body.success) throw new Error(body.error.message);
  return body.data;
};

export const useSubscription = () =>
  useQuery({
    queryKey: subscriptionQueryKeys.mine(),
    queryFn: fetchMySubscription,
  });
