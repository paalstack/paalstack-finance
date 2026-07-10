'use client';

import {
  Box,
  Button,
  Card,
  Grid,
  HStack,
  Label,
  Switch,
  Text,
  VStack,
  toast,
} from '@paalstack/react-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { LoadingState, PageHeader } from '@/components/ui';
import { subscriptionQueryKeys, useSubscription } from '@/hooks/queries';
import { track } from '@/lib/analytics';

import { PlanCard } from './plan-card';

import type { SubscriptionBillingCycle, SubscriptionPlan } from '@/lib/db/schema/subscriptions';
import type { ApiResponse } from '@/types';

const SELECTABLE_PLANS: SubscriptionPlan[] = ['free', 'pro', 'family', 'enterprise'];
const SALES_EMAIL = 'sales@paalstack.com';

const formatDate = (value: string | null): string =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export const BillingView = () => {
  const { data: subscription, isLoading } = useSubscription();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>('monthly');
  const [isBusy, setIsBusy] = useState(false);

  const refetchSubscription = () =>
    queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.mine() });

  const redirectTo = async (endpoint: string, body?: unknown): Promise<void> => {
    setIsBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        ...(body
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
          : {}),
      });
      const parsed = (await response.json()) as ApiResponse<{
        checkoutUrl?: string;
        portalUrl?: string;
      }>;
      if (!parsed.success) {
        toast.error(parsed.error.message);
        return;
      }
      window.location.href =
        parsed.data.checkoutUrl ?? parsed.data.portalUrl ?? '/settings/billing';
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (plan === 'enterprise') {
      window.location.href = `mailto:${SALES_EMAIL}?subject=Enterprise plan enquiry`;
      return;
    }
    if (plan === 'free') return;

    track('checkout_started', { plan, billingCycle });
    void redirectTo('/api/subscriptions/checkout', { plan, billingCycle });
  };

  const handleManageBilling = () => void redirectTo('/api/subscriptions/portal');

  const handleCancel = async () => {
    setIsBusy(true);
    try {
      const response = await fetch('/api/subscriptions/cancel', { method: 'POST' });
      const body = (await response.json()) as ApiResponse<{ cancelAtPeriodEnd: boolean }>;
      if (!body.success) {
        toast.error(body.error.message);
        return;
      }
      toast.success('Your plan will not renew after the current period.');
      await refetchSubscription();
    } catch {
      toast.error('Failed to cancel. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Box className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader title="Billing" description="Manage your plan, payment method, and invoices" />

      <Box className="space-y-6 p-6">
        {isLoading || !subscription ? (
          <LoadingState label="Loading subscription…" />
        ) : (
          <Card
            header={{ title: 'Current subscription' }}
            action={
              subscription.plan !== 'free' ? (
                <Button variant="outline" size="sm" disabled={isBusy} onClick={handleManageBilling}>
                  Manage billing
                </Button>
              ) : undefined
            }
          >
            <VStack className="gap-1.5">
              <Text className="text-sm">
                Plan: <span className="font-semibold">{subscription.plan}</span> (
                {subscription.status})
              </Text>
              {subscription.currentPeriodEnd && (
                <Text className="text-muted-foreground text-sm">
                  {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}{' '}
                  {formatDate(subscription.currentPeriodEnd)}
                </Text>
              )}
              {subscription.plan !== 'free' && !subscription.cancelAtPeriodEnd && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive w-fit px-0"
                  disabled={isBusy}
                  onClick={() => void handleCancel()}
                >
                  Cancel subscription
                </Button>
              )}
            </VStack>
          </Card>
        )}

        <HStack className="items-center gap-2.5">
          <Label htmlFor="billing-cycle" className="text-sm">
            Monthly
          </Label>
          <Switch
            id="billing-cycle"
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <Label htmlFor="billing-cycle" className="text-sm">
            Yearly <span className="text-muted-foreground">(2 months free)</span>
          </Label>
        </HStack>

        <Grid className="grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SELECTABLE_PLANS.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              currentPlan={subscription?.plan ?? 'free'}
              isCurrentPeriodCancelling={Boolean(subscription?.cancelAtPeriodEnd)}
              isBusy={isBusy}
              onSelect={handleSelectPlan}
            />
          ))}
        </Grid>
      </Box>
    </Box>
  );
};
