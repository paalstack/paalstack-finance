'use client';

import {
  Box,
  Button,
  Card,
  Grid,
  HStack,
  Progress,
  TypographyH3,
  TypographyMuted,
  TypographySmall,
} from '@paalstack/react-ui';
import { useState } from 'react';

import { MonthlyTrendChart, SpendingByCategoryChart } from '@/components/charts';
import { LoadingState, PageHeader } from '@/components/ui';
import { useDashboardSummary } from '@/hooks/queries';
import { formatCurrency, roundCurrency } from '@/lib/utils/currency';
import { getCurrentMonthRange, getLastMonthRange, getCurrentYearRange } from '@/lib/utils/date';
import { type DateRange } from '@/types';

const PERIOD_OPTIONS = [
  { label: 'This month', value: 'month' },
  { label: 'Last month', value: 'lastMonth' },
  { label: 'This year', value: 'year' },
] as const;

type PeriodKey = (typeof PERIOD_OPTIONS)[number]['value'];

const RANGE_MAP: Record<PeriodKey, () => DateRange> = {
  month: getCurrentMonthRange,
  lastMonth: getLastMonthRange,
  year: getCurrentYearRange,
};

export const ReportsView = () => {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const range = RANGE_MAP[period]();

  const { summary, spendingByCategory, monthlyTrend, isLoading } = useDashboardSummary(range);

  const currency = summary.currency;

  return (
    <Box className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Reports"
        description="Analyse your spending patterns and trends"
        actions={
          <HStack className="gap-1.5">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={period === opt.value ? 'default' : 'outline'}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </HStack>
        }
      />

      {isLoading ? (
        <Box className="p-6">
          <LoadingState />
        </Box>
      ) : (
        <Grid className="gap-6 p-6">
          {/* Key numbers */}
          <Grid className="grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Income', value: summary.totalIncome, color: 'text-success' },
              { label: 'Expenses', value: summary.totalExpenses, color: 'text-destructive' },
              {
                label: 'Net Savings',
                value: summary.netSavings,
                color: summary.netSavings >= 0 ? 'text-success' : 'text-destructive',
              },
              {
                label: 'Savings rate',
                value:
                  summary.totalIncome > 0
                    ? roundCurrency((summary.netSavings / summary.totalIncome) * 100)
                    : 0,
                isPercent: true,
                color: 'text-info',
              },
            ].map((stat) => (
              <Card key={stat.label} contentClassName="gap-1">
                <TypographyMuted className="text-xs">{stat.label}</TypographyMuted>
                <TypographyH3 className={`text-xl font-bold tabular-nums ${stat.color}`}>
                  {stat.isPercent ? `${stat.value}%` : formatCurrency(stat.value, { currency })}
                </TypographyH3>
              </Card>
            ))}
          </Grid>

          {/* Charts */}
          <Grid className="grid-cols-1 gap-4 lg:grid-cols-2">
            <Card header={{ title: 'Spending by category' }}>
              <SpendingByCategoryChart data={spendingByCategory} currency={currency} height={260} />
              {spendingByCategory.length > 0 && (
                <Box className="mt-3 space-y-2">
                  {spendingByCategory.map((s) => (
                    <Box key={s.categoryId}>
                      <HStack className="mb-0.5 justify-between">
                        <HStack className="gap-1.5">
                          <Box
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <TypographySmall className="text-xs">{s.categoryName}</TypographySmall>
                        </HStack>
                        <HStack className="gap-2">
                          <TypographyMuted className="text-xs">{s.percentage}%</TypographyMuted>
                          <TypographySmall className="text-xs font-medium tabular-nums">
                            {formatCurrency(s.amount, { currency })}
                          </TypographySmall>
                        </HStack>
                      </HStack>
                      <Progress value={s.percentage} className="h-1" />
                    </Box>
                  ))}
                </Box>
              )}
            </Card>

            <Card header={{ title: 'Monthly trend' }}>
              <MonthlyTrendChart data={monthlyTrend} currency={currency} height={260} />
              <Box className="mt-4 space-y-2">
                {monthlyTrend
                  .filter((m) => m.income > 0 || m.expenses > 0)
                  .slice(-3)
                  .reverse()
                  .map((m) => (
                    <HStack key={m.month} className="justify-between">
                      <TypographyMuted className="w-12 text-xs">{m.month.slice(5)}</TypographyMuted>
                      <HStack className="gap-4">
                        <TypographySmall className="text-success text-xs tabular-nums">
                          +{formatCurrency(m.income, { currency })}
                        </TypographySmall>
                        <TypographySmall className="text-destructive text-xs tabular-nums">
                          -{formatCurrency(m.expenses, { currency })}
                        </TypographySmall>
                        <TypographySmall
                          className={`text-xs font-semibold tabular-nums ${m.savings >= 0 ? 'text-success' : 'text-destructive'}`}
                        >
                          {m.savings >= 0 ? '+' : ''}
                          {formatCurrency(m.savings, { currency })}
                        </TypographySmall>
                      </HStack>
                    </HStack>
                  ))}
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
