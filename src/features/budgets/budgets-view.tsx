'use client';

import {
  Box,
  Button,
  Card,
  Dialog,
  Grid,
  Progress,
  TypographyMuted,
  TypographySmall,
  toast,
} from '@paalstack/react-ui';
import { useState } from 'react';

import { EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { useDeleteBudget } from '@/hooks/mutations';
import { useBudgets, useTransactions } from '@/hooks/queries';
import { formatCurrency, roundCurrency, sumAmounts } from '@/lib/utils/currency';
import { getCurrentMonthRange } from '@/lib/utils/date';

import { BudgetForm } from './budget-form';

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

const getProgressVariant = (b: { isOverBudget: boolean; isNearLimit: boolean }) => {
  if (b.isOverBudget) return 'danger';
  if (b.isNearLimit) return 'warning';
  return 'success';
};

export const BudgetsView = () => {
  const [open, setOpen] = useState(false);
  const { data: budgets = [], isLoading } = useBudgets();
  const period = getCurrentMonthRange();
  const { data: transactions = [] } = useTransactions({ dateRange: period });
  const { mutateAsync: deleteBudget } = useDeleteBudget();

  const completedExpenses = transactions.filter(
    (t) => t.status === 'completed' && t.type === 'expense'
  );

  const budgetProgress = budgets.map((budget) => {
    const limit = parseFloat(String(budget.amount));
    const relevant = budget.category_id
      ? completedExpenses.filter((t) => t.category_id === budget.category_id)
      : completedExpenses;
    const spent = sumAmounts(relevant.map((t) => parseFloat(String(t.amount))));
    const remaining = roundCurrency(Math.max(0, limit - spent));
    const percentUsed = limit > 0 ? roundCurrency((spent / limit) * 100) : 0;
    const alertThreshold = parseFloat(String(budget.alert_threshold ?? 80));
    const isOverBudget = spent > limit;
    const isNearLimit = percentUsed >= alertThreshold && !isOverBudget;

    const cat = budget.categories;

    return {
      ...budget,
      spent: roundCurrency(spent),
      remaining,
      percentUsed,
      alertThreshold,
      isOverBudget,
      isNearLimit,
      categoryName: cat?.name ?? 'Overall',
      categoryColor: cat?.color ?? '#6366f1',
    };
  });

  const overBudget = budgetProgress.filter((b) => b.isOverBudget);
  const nearLimit = budgetProgress.filter((b) => b.isNearLimit);

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
      toast.success('Budget deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete budget');
    }
  };

  return (
    <Box className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Budgets"
        description="Set monthly spending limits and track progress"
        actions={
          <Dialog
            open={open}
            onOpenChange={setOpen}
            trigger={<Button size="sm">Create budget</Button>}
            header={{ title: 'Create budget' }}
            contentClassName="max-w-lg"
          >
            <BudgetForm onSuccess={() => setOpen(false)} />
          </Dialog>
        }
      />

      <Grid className="gap-4 p-6">
        {/* Overspending alerts */}
        {overBudget.length > 0 && (
          <Box className="border-destructive bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
            <strong>
              {overBudget.length} budget{overBudget.length > 1 ? 's' : ''} exceeded:
            </strong>{' '}
            {overBudget.map((b) => b.name).join(', ')}
          </Box>
        )}
        {nearLimit.length > 0 && (
          <Box className="border-warning bg-warning/10 text-warning rounded-lg border p-4 text-sm">
            <strong>
              {nearLimit.length} budget{nearLimit.length > 1 ? 's' : ''} near limit:
            </strong>{' '}
            {nearLimit.map((b) => `${b.name} (${b.percentUsed}%)`).join(', ')}
          </Box>
        )}

        {isLoading && <LoadingState />}
        {!isLoading && budgets.length === 0 && (
          <EmptyState
            title="No budgets set"
            description="Create a budget to start tracking your spending limits."
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                Create budget
              </Button>
            }
          />
        )}
        {!isLoading && budgets.length > 0 && (
          <Grid className="grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgetProgress.map((b) => {
              const progressVariant = getProgressVariant(b);

              return (
                <Card
                  key={b.id}
                  contentClassName="gap-3"
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive text-xs"
                      onClick={() => void handleDelete(b.id)}
                    >
                      Delete
                    </Button>
                  }
                >
                  <Box className="flex items-center justify-between">
                    <Box>
                      <TypographySmall className="font-semibold">{b.name}</TypographySmall>
                      <Box className="mt-0.5 flex items-center gap-1.5">
                        <Box
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: b.categoryColor }}
                        />
                        <TypographyMuted className="text-xs">
                          {b.categoryName} · {PERIOD_LABELS[b.period] ?? b.period}
                        </TypographyMuted>
                      </Box>
                    </Box>
                  </Box>

                  <Box>
                    <Box className="mb-1 flex justify-between">
                      <TypographyMuted className="text-xs">
                        {formatCurrency(b.spent, { currency: b.currency })} spent
                      </TypographyMuted>
                      <TypographyMuted className="text-xs font-medium">
                        {b.percentUsed}%
                      </TypographyMuted>
                    </Box>
                    <Progress value={Math.min(b.percentUsed, 100)} variant={progressVariant} />
                    <Box className="mt-1 flex justify-between">
                      <TypographyMuted className="text-xs">
                        {formatCurrency(b.remaining, { currency: b.currency })} remaining
                      </TypographyMuted>
                      <TypographyMuted className="text-xs">
                        of {formatCurrency(parseFloat(String(b.amount)), { currency: b.currency })}
                      </TypographyMuted>
                    </Box>
                  </Box>
                </Card>
              );
            })}
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
