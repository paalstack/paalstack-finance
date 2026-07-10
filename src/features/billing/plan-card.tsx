'use client';

import { Badge, Box, Button, Card, Text, VStack } from '@paalstack/react-ui';

import { PLAN_DISPLAY } from '@/lib/billing/plan-display';

import type { SubscriptionPlan } from '@/lib/db/schema/subscriptions';

type PlanCardProps = {
  plan: SubscriptionPlan;
  currentPlan: SubscriptionPlan;
  isCurrentPeriodCancelling: boolean;
  isBusy: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
};

export const PlanCard = ({
  plan,
  currentPlan,
  isCurrentPeriodCancelling,
  isBusy,
  onSelect,
}: PlanCardProps) => {
  const display = PLAN_DISPLAY[plan];
  const isCurrent = plan === currentPlan;
  const isDowngradeTarget = plan === 'free' && currentPlan !== 'free';

  const actionLabel = (() => {
    if (isCurrent) return isCurrentPeriodCancelling ? 'Cancels at period end' : 'Current plan';
    if (plan === 'enterprise') return 'Contact sales';
    if (isDowngradeTarget) return 'Downgrade';
    return 'Upgrade';
  })();

  return (
    <Card
      header={{ title: display.name, description: display.description }}
      action={isCurrent ? <Badge label="Current" variant="default" /> : undefined}
    >
      <VStack className="gap-4">
        <Box>
          {display.priceMonthly === null ? (
            <Text className="text-2xl font-bold">Custom</Text>
          ) : (
            <Text className="text-2xl font-bold">
              ₹{display.priceMonthly}
              <span className="text-muted-foreground text-sm font-normal">/month</span>
            </Text>
          )}
        </Box>

        <VStack className="gap-1.5">
          {display.features.map((feature) => (
            <Text key={feature} className="text-muted-foreground text-sm">
              ✓ {feature}
            </Text>
          ))}
        </VStack>

        <Button
          variant={isCurrent ? 'outline' : 'default'}
          disabled={isCurrent || isBusy || plan === 'free'}
          onClick={() => onSelect(plan)}
          className="w-full"
        >
          {actionLabel}
        </Button>
      </VStack>
    </Card>
  );
};
