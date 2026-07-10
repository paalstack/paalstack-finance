'use client';

import {
  Badge,
  Box,
  Card,
  Grid,
  HStack,
  TypographyH3,
  TypographyMuted,
  TypographySmall,
} from '@paalstack/react-ui';

import { MonthlyTrendChart, SpendingByCategoryChart } from '@/components/charts';
import { EmptyState, LoadingState, PageHeader, StatCard } from '@/components/ui';
import { useDashboardSummary } from '@/hooks/queries';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';

export const DashboardView = () => {
  const {
    summary,
    spendingByCategory,
    monthlyTrend,
    budgetsNearLimit,
    emiDue,
    recentTransactions = [],
    isLoading,
  } = useDashboardSummary();

  const currency = summary.currency;

  if (isLoading) {
    return (
      <Box className="flex flex-1 flex-col overflow-y-auto">
        <PageHeader title="Dashboard" description="Your financial overview" />
        <Box className="p-6">
          <LoadingState />
        </Box>
      </Box>
    );
  }

  return (
    <Box className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader title="Dashboard" description="Your financial overview" />

      <Grid className="gap-6 p-6">
        {/* Summary stats */}
        <Grid className="grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Balance"
            value={formatCurrency(summary.totalBalance, { currency })}
          />
          <StatCard
            label="Income"
            value={formatCurrency(summary.totalIncome, { currency })}
            hint="This month"
            valueClassName="text-success"
          />
          <StatCard
            label="Expenses"
            value={formatCurrency(summary.totalExpenses, { currency })}
            hint="This month"
            valueClassName="text-destructive"
          />
          <StatCard
            label="Net Savings"
            value={formatCurrency(summary.netSavings, { currency })}
            hint="This month"
            valueClassName={summary.netSavings >= 0 ? 'text-success' : 'text-destructive'}
          />
        </Grid>

        {/* EMI due */}
        {emiDue.activeLoansCount > 0 && (
          <Card contentClassName="gap-2">
            <HStack className="justify-between">
              <TypographyH3 className="text-sm font-semibold">Monthly EMI Obligations</TypographyH3>
              <Badge variant="outline">{emiDue.activeLoansCount} active loans</Badge>
            </HStack>
            <TypographyH3 className="text-2xl font-bold tabular-nums">
              {formatCurrency(emiDue.totalMonthlyEmi, { currency: emiDue.currency })}
            </TypographyH3>
            {emiDue.upcomingPayments.slice(0, 3).map((p) => (
              <HStack key={p.loanId} className="justify-between">
                <TypographySmall className="text-muted-foreground">{p.lender}</TypographySmall>
                <TypographySmall className="font-medium tabular-nums">
                  {formatCurrency(p.emiAmount, { currency: p.currency })}
                </TypographySmall>
              </HStack>
            ))}
          </Card>
        )}

        {/* Charts row */}
        <Grid className="grid-cols-1 gap-4 lg:grid-cols-2">
          <Card header={{ title: 'Spending by category' }}>
            <SpendingByCategoryChart data={spendingByCategory} currency={currency} />
            {/* Legend */}
            {spendingByCategory.length > 0 && (
              <Grid className="mt-3 grid-cols-2 gap-1.5">
                {spendingByCategory.slice(0, 6).map((s) => (
                  <HStack key={s.categoryId} className="gap-1.5">
                    <Box
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <TypographyMuted className="truncate text-xs">{s.categoryName}</TypographyMuted>
                    <TypographyMuted className="ml-auto text-xs tabular-nums">
                      {s.percentage}%
                    </TypographyMuted>
                  </HStack>
                ))}
              </Grid>
            )}
          </Card>

          <Card header={{ title: 'Monthly trend', description: 'Last 6 months' }}>
            <MonthlyTrendChart data={monthlyTrend} currency={currency} />
            <HStack className="mt-2 justify-center gap-4">
              <HStack className="gap-1.5">
                <Box
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--chart-2)' }}
                />
                <TypographyMuted className="text-xs">Income</TypographyMuted>
              </HStack>
              <HStack className="gap-1.5">
                <Box
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--chart-1)' }}
                />
                <TypographyMuted className="text-xs">Expenses</TypographyMuted>
              </HStack>
            </HStack>
          </Card>
        </Grid>

        {/* Bottom row: recent transactions + budgets near limit */}
        <Grid className="grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent transactions */}
          <Card header={{ title: 'Recent transactions' }}>
            {recentTransactions.length === 0 ? (
              <EmptyState title="No recent transactions" />
            ) : (
              <Box className="divide-border divide-y">
                {recentTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const amount = parseFloat(String(tx.amount));
                  const cat = tx.categories;

                  return (
                    <HStack key={tx.id} className="justify-between py-2.5">
                      <Box>
                        <TypographySmall className="font-medium">
                          {tx.description ?? cat?.name ?? tx.type}
                        </TypographySmall>
                        <TypographyMuted className="text-xs">
                          {formatDate(String(tx.transaction_date))}
                        </TypographyMuted>
                      </Box>
                      <TypographySmall
                        className={`font-semibold tabular-nums ${isIncome ? 'text-success' : 'text-destructive'}`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(amount, { currency: tx.currency })}
                      </TypographySmall>
                    </HStack>
                  );
                })}
              </Box>
            )}
          </Card>

          {/* Budgets near limit */}
          <Card header={{ title: 'Budgets near limit' }}>
            {budgetsNearLimit.length === 0 ? (
              <EmptyState title="All budgets on track" />
            ) : (
              <Box className="divide-border divide-y">
                {budgetsNearLimit.map((b) => (
                  <Box key={b.budgetId} className="py-2.5">
                    <HStack className="mb-1 justify-between">
                      <TypographySmall className="font-medium">{b.name}</TypographySmall>
                      <Badge
                        className={
                          b.isOverBudget
                            ? 'bg-destructive-soft text-destructive text-xs'
                            : 'bg-warning-soft text-warning text-xs'
                        }
                      >
                        {b.percentUsed}%
                      </Badge>
                    </HStack>
                    <HStack className="justify-between">
                      <TypographyMuted className="text-xs">
                        {formatCurrency(b.spent, { currency: b.currency })} of{' '}
                        {formatCurrency(b.limit, { currency: b.currency })}
                      </TypographyMuted>
                      <TypographyMuted className="text-xs">
                        {formatCurrency(b.remaining, { currency: b.currency })} left
                      </TypographyMuted>
                    </HStack>
                  </Box>
                ))}
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
