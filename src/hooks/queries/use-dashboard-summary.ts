import { useMemo } from 'react';

import { roundCurrency, sumAmounts } from '@/lib/utils/currency';
import { getCurrentMonthRange, toISODateString } from '@/lib/utils/date';
import {
  type BudgetProgress,
  type DateRange,
  type DashboardSummary,
  type EmiDueSummary,
  type MonthlyTrend,
  type SpendingByCategory,
} from '@/types';

import { useAccounts } from './use-accounts';
import { useBudgets } from './use-budgets';
import { useLoans } from './use-loans';
import { useTransactions } from './use-transactions';

type UseDashboardSummaryReturn = {
  summary: DashboardSummary;
  spendingByCategory: SpendingByCategory[];
  monthlyTrend: MonthlyTrend[];
  budgetsNearLimit: BudgetProgress[];
  emiDue: EmiDueSummary;
  recentTransactions: ReturnType<typeof useTransactions>['data'];
  isLoading: boolean;
};

export const useDashboardSummary = (range?: DateRange): UseDashboardSummaryReturn => {
  const period = range ?? getCurrentMonthRange();

  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: allTransactions = [], isLoading: txLoading } = useTransactions({
    dateRange: period,
  });
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: loans = [], isLoading: loansLoading } = useLoans(true);

  const isLoading = accountsLoading || txLoading || budgetsLoading || loansLoading;

  const summary = useMemo<DashboardSummary>(() => {
    const totalBalance = sumAmounts(accounts.map((a) => parseFloat(String(a.balance))));

    const completed = allTransactions.filter((t) => t.status === 'completed');
    const totalIncome = sumAmounts(
      completed.filter((t) => t.type === 'income').map((t) => parseFloat(String(t.amount)))
    );
    const totalExpenses = sumAmounts(
      completed.filter((t) => t.type === 'expense').map((t) => parseFloat(String(t.amount)))
    );
    const netSavings = roundCurrency(totalIncome - totalExpenses);

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      netSavings,
      currency: accounts[0]?.currency ?? 'INR',
      period,
    };
  }, [accounts, allTransactions, period]);

  const spendingByCategory = useMemo<SpendingByCategory[]>(() => {
    const completed = allTransactions.filter(
      (t) => t.status === 'completed' && t.type === 'expense'
    );
    const totalExpenses = sumAmounts(completed.map((t) => parseFloat(String(t.amount))));
    if (totalExpenses === 0) return [];

    const byCategory: Record<
      string,
      { name: string; color: string; icon: string; amount: number; count: number }
    > = {};

    for (const t of completed) {
      const catId = t.category_id ?? 'uncategorized';
      const cat = t.categories;
      const name = cat?.name ?? 'Uncategorized';
      const color = cat?.color ?? '#64748b';
      const icon = cat?.icon ?? 'tag';

      byCategory[catId] ??= { name, color, icon, amount: 0, count: 0 };
      byCategory[catId].amount += parseFloat(String(t.amount));
      byCategory[catId].count += 1;
    }

    return Object.entries(byCategory)
      .map(([categoryId, v]) => ({
        categoryId,
        categoryName: v.name,
        color: v.color,
        icon: v.icon,
        amount: roundCurrency(v.amount),
        percentage: roundCurrency((v.amount / totalExpenses) * 100),
        transactionCount: v.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [allTransactions]);

  const monthlyTrend = useMemo<MonthlyTrend[]>(() => {
    // Build last 6 months
    const months: MonthlyTrend[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: monthKey, income: 0, expenses: 0, savings: 0 });
    }

    // Fetch transactions for full 6-month window (we already have current month; extend query
    // would require separate hook call — for now compute from available data)
    for (const t of allTransactions) {
      if (t.status !== 'completed') continue;
      const txDate = String(t.transaction_date ?? '');
      const monthKey = txDate.slice(0, 7);
      const entry = months.find((m) => m.month === monthKey);
      if (!entry) continue;
      const amount = parseFloat(String(t.amount));
      if (t.type === 'income') entry.income += amount;
      if (t.type === 'expense') entry.expenses += amount;
    }

    return months.map((m) => ({
      ...m,
      income: roundCurrency(m.income),
      expenses: roundCurrency(m.expenses),
      savings: roundCurrency(m.income - m.expenses),
    }));
  }, [allTransactions]);

  const budgetsNearLimit = useMemo<BudgetProgress[]>(() => {
    const completed = allTransactions.filter(
      (t) => t.status === 'completed' && t.type === 'expense'
    );

    return budgets
      .map((budget) => {
        const limit = parseFloat(String(budget.amount));
        const relevant = budget.category_id
          ? completed.filter((t) => t.category_id === budget.category_id)
          : completed;
        const spent = sumAmounts(relevant.map((t) => parseFloat(String(t.amount))));
        const remaining = roundCurrency(Math.max(0, limit - spent));
        const percentUsed = limit > 0 ? roundCurrency((spent / limit) * 100) : 0;
        const alertThreshold = parseFloat(String(budget.alert_threshold ?? 80));

        return {
          budgetId: budget.id,
          name: budget.name,
          limit,
          spent: roundCurrency(spent),
          remaining,
          percentUsed,
          currency: budget.currency,
          period: budget.period,
          isOverBudget: spent > limit,
          alertThreshold,
        };
      })
      .filter((b) => b.percentUsed >= b.alertThreshold)
      .sort((a, b) => b.percentUsed - a.percentUsed)
      .slice(0, 5);
  }, [budgets, allTransactions]);

  const emiDue = useMemo<EmiDueSummary>(() => {
    const activeLoans = loans.filter((l) => l.status === 'active');
    const totalMonthlyEmi = sumAmounts(activeLoans.map((l) => parseFloat(String(l.emi_amount))));
    const today = toISODateString(new Date());

    return {
      totalMonthlyEmi,
      activeLoansCount: activeLoans.length,
      currency: activeLoans[0]?.currency ?? 'INR',
      upcomingPayments: activeLoans
        .filter((l) => l.due_date >= today)
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 5)
        .map((l) => ({
          loanId: l.id,
          lender: l.lender,
          emiAmount: parseFloat(String(l.emi_amount)),
          dueDate: String(l.due_date),
          currency: l.currency,
        })),
    };
  }, [loans]);

  const recentTransactions = useMemo(() => allTransactions.slice(0, 10), [allTransactions]);

  return {
    summary,
    spendingByCategory,
    monthlyTrend,
    budgetsNearLimit,
    emiDue,
    recentTransactions,
    isLoading,
  };
};
