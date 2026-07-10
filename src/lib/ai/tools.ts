import { tool } from 'ai';
import { and, asc, eq, gte, lte, sql, sum } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { budgets, categories, loans, transactions } from '@/lib/db/schema';
import { roundCurrency, sumAmounts } from '@/lib/utils/currency';
import { getBudgetPeriodRange, getCurrentMonthRange, toISODateString } from '@/lib/utils/date';

import { cacheFinanceQuery } from './cache';

const dateRangeShape = {
  from: z
    .string()
    .date()
    .optional()
    .describe('Start date (YYYY-MM-DD), inclusive. Defaults to the start of the current month.'),
  to: z.string().date().optional().describe('End date (YYYY-MM-DD), inclusive. Defaults to today.'),
};

const resolveRange = (from?: string, to?: string): { from: string; to: string } => {
  const defaultRange = getCurrentMonthRange();
  return {
    from: from ?? toISODateString(defaultRange.from),
    to: to ?? toISODateString(new Date()),
  };
};

type CategorySpend = {
  categoryId: string | null;
  categoryName: string;
  amount: number;
  transactionCount: number;
};

/** Shared SQL-aggregated spend-by-category query, backing both spend-summary tools. */
const querySpendingByCategoryUncached = async (
  userId: string,
  range: { from: string; to: string },
  categoryId?: string
): Promise<CategorySpend[]> => {
  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      total: sum(transactions.amount),
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        eq(transactions.status, 'completed'),
        gte(transactions.transactionDate, range.from),
        lte(transactions.transactionDate, range.to),
        categoryId ? eq(transactions.categoryId, categoryId) : undefined
      )
    )
    .groupBy(categories.id, categories.name);

  return rows
    .map((row) => ({
      categoryId: row.categoryId ?? null,
      categoryName: row.categoryName ?? 'Uncategorized',
      amount: roundCurrency(parseFloat(row.total ?? '0')),
      transactionCount: Number(row.count),
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Cached per-user, tagged `finance:${userId}` — a single AI turn commonly
 * calls multiple tools (e.g. `getBudgetStatus` + `getEmiWarnings`) that each
 * recompute overlapping category sums, so this avoids re-scanning
 * `transactions` several times per turn. Invalidated immediately on any
 * transaction/budget write (see `revalidateFinanceCache` call sites in
 * `lib/actions/*-actions.ts`), with a 60s TTL as a safety net.
 */
const querySpendingByCategory = (
  userId: string,
  range: { from: string; to: string },
  categoryId?: string
): Promise<CategorySpend[]> =>
  cacheFinanceQuery(userId, 'spending-by-category', querySpendingByCategoryUncached)(
    userId,
    range,
    categoryId
  );

const sumTransactions = async (
  userId: string,
  type: 'income' | 'expense',
  range: { from: string; to: string }
): Promise<number> => {
  const [row] = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, type),
        eq(transactions.status, 'completed'),
        gte(transactions.transactionDate, range.from),
        lte(transactions.transactionDate, range.to)
      )
    );
  return roundCurrency(parseFloat(row?.total ?? '0'));
};

/**
 * Builds the AI SDK tool set for one authenticated user. `userId` is closed
 * over here (server-resolved via `requireAuth()`), never accepted as a tool
 * input — the model can ask questions, but it can never choose whose data
 * to read.
 */
export const createFinanceTools = (userId: string) => ({
  getSpendingSummary: tool({
    description:
      "Get the user's total spending for a date range, broken down by category. Use this for 'how much did I spend' style questions.",
    inputSchema: z.object({
      ...dateRangeShape,
      categoryId: z.string().uuid().optional().describe('Limit to a single category.'),
    }),
    execute: async ({ from, to, categoryId }) => {
      const range = resolveRange(from, to);
      const byCategory = await querySpendingByCategory(userId, range, categoryId);
      const totalSpent = roundCurrency(sumAmounts(byCategory.map((c) => c.amount)));
      return { period: range, totalSpent, byCategory };
    },
  }),

  getTopCategories: tool({
    description:
      "Get the top N highest-spending categories for a date range. Use this for 'which category is highest' style questions.",
    inputSchema: z.object({
      ...dateRangeShape,
      limit: z.coerce.number().int().min(1).max(20).default(5),
    }),
    execute: async ({ from, to, limit }) => {
      const range = resolveRange(from, to);
      const byCategory = await querySpendingByCategory(userId, range);
      return { period: range, topCategories: byCategory.slice(0, limit) };
    },
  }),

  getBudgetStatus: tool({
    description:
      'Get the status of all active budgets: limit, amount spent, remaining, and percent used, each computed for its own current period window.',
    inputSchema: z.object({}),
    execute: async () => {
      const activeBudgets = await db.query.budgets.findMany({
        where: and(eq(budgets.userId, userId), eq(budgets.isActive, true)),
      });

      const results = await Promise.all(
        activeBudgets.map(async (budget) => {
          const window = getBudgetPeriodRange(budget.period, budget.startDate, budget.endDate);
          const range = { from: toISODateString(window.from), to: toISODateString(window.to) };
          const spend = budget.categoryId
            ? await querySpendingByCategory(userId, range, budget.categoryId)
            : await querySpendingByCategory(userId, range);
          const spent = roundCurrency(sumAmounts(spend.map((c) => c.amount)));
          const limit = parseFloat(budget.amount);
          const alertThreshold = parseFloat(budget.alertThreshold ?? '80');
          const percentUsed = limit > 0 ? roundCurrency((spent / limit) * 100) : 0;

          return {
            budgetId: budget.id,
            name: budget.name,
            period: budget.period,
            limit,
            spent,
            remaining: roundCurrency(Math.max(0, limit - spent)),
            percentUsed,
            currency: budget.currency,
            isOverBudget: spent > limit,
            isNearThreshold: percentUsed >= alertThreshold,
          };
        })
      );

      return { budgets: results };
    },
  }),

  getEmiWarnings: tool({
    description:
      "Check the user's active loans for EMIs that are overdue or due within the next 14 days, and the overall EMI-to-income burden. Use this proactively whenever the user asks about savings, budget, or upcoming obligations.",
    inputSchema: z.object({}),
    execute: async () => {
      const today = toISODateString(new Date());
      const in14Days = toISODateString(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

      const activeLoans = await db.query.loans.findMany({
        where: and(eq(loans.userId, userId), eq(loans.status, 'active')),
        orderBy: asc(loans.dueDate),
      });

      const overdue = activeLoans.filter((loan) => loan.dueDate < today);
      const dueSoon = activeLoans.filter(
        (loan) => loan.dueDate >= today && loan.dueDate <= in14Days
      );
      const totalMonthlyEmi = roundCurrency(
        sumAmounts(activeLoans.map((loan) => parseFloat(loan.emiAmount)))
      );

      const monthRange = getCurrentMonthRange();
      const monthlyIncome = await sumTransactions(userId, 'income', {
        from: toISODateString(monthRange.from),
        to: toISODateString(monthRange.to),
      });
      const emiToIncomeRatio =
        monthlyIncome > 0 ? roundCurrency(totalMonthlyEmi / monthlyIncome) : null;

      return {
        totalMonthlyEmi,
        activeLoansCount: activeLoans.length,
        monthlyIncome,
        emiToIncomeRatio,
        isHighBurden: emiToIncomeRatio !== null && emiToIncomeRatio > 0.4,
        overdue: overdue.map((loan) => ({
          loanId: loan.id,
          lender: loan.lender,
          emiAmount: parseFloat(loan.emiAmount),
          dueDate: loan.dueDate,
          currency: loan.currency,
        })),
        dueSoon: dueSoon.map((loan) => ({
          loanId: loan.id,
          lender: loan.lender,
          emiAmount: parseFloat(loan.emiAmount),
          dueDate: loan.dueDate,
          currency: loan.currency,
        })),
      };
    },
  }),

  getSavingsSnapshot: tool({
    description:
      "Get the user's income, expenses, and net savings trend for the last N months. Use this for 'can I save more' style questions.",
    inputSchema: z.object({
      months: z.coerce.number().int().min(1).max(24).default(6),
    }),
    execute: async ({ months }) => {
      const from = toISODateString(
        new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1)
      );
      const to = toISODateString(new Date());

      const rows = await db
        .select({
          month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
          type: transactions.type,
          total: sum(transactions.amount),
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.status, 'completed'),
            gte(transactions.transactionDate, from),
            lte(transactions.transactionDate, to)
          )
        )
        .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`, transactions.type)
        .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`);

      const byMonth = new Map<string, { income: number; expenses: number }>();
      for (const row of rows) {
        const entry = byMonth.get(row.month) ?? { income: 0, expenses: 0 };
        const amount = roundCurrency(parseFloat(row.total ?? '0'));
        if (row.type === 'income') entry.income = amount;
        if (row.type === 'expense') entry.expenses = amount;
        byMonth.set(row.month, entry);
      }

      const trend = Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { income, expenses }]) => ({
          month,
          income,
          expenses,
          savings: roundCurrency(income - expenses),
          savingsRate: income > 0 ? roundCurrency(((income - expenses) / income) * 100) : 0,
        }));

      const avgSavingsRate =
        trend.length > 0
          ? roundCurrency(sumAmounts(trend.map((t) => t.savingsRate)) / trend.length)
          : 0;

      return { trend, avgSavingsRate };
    },
  }),
});

export type FinanceTools = ReturnType<typeof createFinanceTools>;
