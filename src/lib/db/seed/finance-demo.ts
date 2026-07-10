import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  accounts,
  aiConversations,
  budgets,
  categories,
  loanPayments,
  loans,
  notifications,
  subscriptions,
  transactions,
} from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';

import { DEMO_IDS } from './demo-ids';

const findSystemCategoryId = async (slug: string, type: 'income' | 'expense') => {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.type, type), eq(categories.isSystem, true)))
    .limit(1);

  return category?.id ?? null;
};

const seedDemoAccounts = async () => {
  const rows = [
    {
      id: DEMO_IDS.accounts.ownerBank,
      userId: DEMO_IDS.users.owner,
      name: 'HDFC Salary Account',
      type: 'savings' as const,
      balance: '125000.00',
      isDefault: true,
    },
    {
      id: DEMO_IDS.accounts.ownerCash,
      userId: DEMO_IDS.users.owner,
      name: 'Cash Wallet',
      type: 'cash' as const,
      balance: '3500.00',
    },
    {
      id: DEMO_IDS.accounts.spouseBank,
      userId: DEMO_IDS.users.spouse,
      name: 'ICICI Savings Account',
      type: 'savings' as const,
      balance: '78000.00',
      isDefault: true,
    },
  ];

  await db
    .insert(accounts)
    .values(rows)
    .onConflictDoUpdate({
      target: accounts.id,
      set: { balance: sql`excluded.balance`, updatedAt: sql`now()` },
    });

  logger.info(`Seeded ${rows.length} demo accounts`);
};

const seedDemoTransactions = async () => {
  const [salaryCategoryId, groceriesCategoryId, emiCategoryId, freelanceCategoryId] =
    await Promise.all([
      findSystemCategoryId('salary', 'income'),
      findSystemCategoryId('groceries', 'expense'),
      findSystemCategoryId('emi', 'expense'),
      findSystemCategoryId('freelance', 'income'),
    ]);

  const rows = [
    {
      id: DEMO_IDS.transactions.salary,
      userId: DEMO_IDS.users.owner,
      familyId: DEMO_IDS.family,
      accountId: DEMO_IDS.accounts.ownerBank,
      categoryId: salaryCategoryId,
      type: 'income' as const,
      amount: '95000.00',
      description: 'Monthly salary',
      notes: 'Credited on 1st of the month',
      transactionDate: '2026-07-01',
    },
    {
      id: DEMO_IDS.transactions.groceries,
      userId: DEMO_IDS.users.spouse,
      familyId: DEMO_IDS.family,
      accountId: DEMO_IDS.accounts.spouseBank,
      categoryId: groceriesCategoryId,
      type: 'expense' as const,
      amount: '4250.50',
      description: 'Weekly groceries',
      notes: 'Big Bazaar run',
      transactionDate: '2026-07-05',
    },
    {
      id: DEMO_IDS.transactions.emi,
      userId: DEMO_IDS.users.owner,
      familyId: DEMO_IDS.family,
      accountId: DEMO_IDS.accounts.ownerBank,
      categoryId: emiCategoryId,
      type: 'expense' as const,
      amount: '18500.00',
      description: 'Home loan EMI',
      notes: 'Auto-debited EMI for July',
      transactionDate: '2026-07-05',
    },
    {
      id: DEMO_IDS.transactions.freelance,
      userId: DEMO_IDS.users.owner,
      accountId: DEMO_IDS.accounts.ownerCash,
      categoryId: freelanceCategoryId,
      type: 'income' as const,
      amount: '12000.00',
      description: 'Freelance web project',
      transactionDate: '2026-07-08',
    },
  ];

  await db
    .insert(transactions)
    .values(rows)
    .onConflictDoUpdate({
      target: transactions.id,
      set: { amount: sql`excluded.amount`, updatedAt: sql`now()` },
    });

  logger.info(`Seeded ${rows.length} demo transactions`);
};

const seedDemoBudgets = async () => {
  const groceriesCategoryId = await findSystemCategoryId('groceries', 'expense');
  const foodCategoryId = await findSystemCategoryId('food', 'expense');

  const rows = [
    {
      id: DEMO_IDS.budgets.groceries,
      userId: DEMO_IDS.users.owner,
      familyId: DEMO_IDS.family,
      categoryId: groceriesCategoryId,
      name: 'Family Groceries',
      amount: '15000.00',
      period: 'monthly' as const,
      startDate: new Date('2026-07-01T00:00:00Z'),
      alertThreshold: '80',
    },
    {
      id: DEMO_IDS.budgets.food,
      userId: DEMO_IDS.users.owner,
      familyId: DEMO_IDS.family,
      categoryId: foodCategoryId,
      name: 'Dining Out',
      amount: '6000.00',
      period: 'monthly' as const,
      startDate: new Date('2026-07-01T00:00:00Z'),
      alertThreshold: '90',
    },
  ];

  await db
    .insert(budgets)
    .values(rows)
    .onConflictDoUpdate({
      target: budgets.id,
      set: { amount: sql`excluded.amount`, updatedAt: sql`now()` },
    });

  logger.info(`Seeded ${rows.length} demo budgets`);
};

const seedDemoLoan = async () => {
  await db
    .insert(loans)
    .values({
      id: DEMO_IDS.loan,
      userId: DEMO_IDS.users.owner,
      familyId: DEMO_IDS.family,
      accountId: DEMO_IDS.accounts.ownerBank,
      lender: 'HDFC Bank',
      type: 'home',
      principal: '3500000.00',
      interestRate: '8.75',
      emiAmount: '18500.00',
      tenureMonths: 240,
      startDate: '2024-01-05',
      dueDate: '2026-08-05',
      remainingBalance: '3180500.00',
      status: 'active',
      notes: 'Home loan for the Kumar residence',
    })
    .onConflictDoUpdate({
      target: loans.id,
      set: { remainingBalance: sql`excluded.remaining_balance`, updatedAt: sql`now()` },
    });

  const paymentRows = [
    {
      id: DEMO_IDS.loanPayments.first,
      loanId: DEMO_IDS.loan,
      transactionId: DEMO_IDS.transactions.emi,
      amount: '18500.00',
      principalComponent: '5687.50',
      interestComponent: '12812.50',
      paymentDate: '2026-06-05',
      status: 'paid' as const,
    },
    {
      id: DEMO_IDS.loanPayments.second,
      loanId: DEMO_IDS.loan,
      transactionId: null,
      amount: '18500.00',
      principalComponent: '5729.16',
      interestComponent: '12770.84',
      paymentDate: '2026-08-05',
      status: 'pending' as const,
    },
  ];

  await db
    .insert(loanPayments)
    .values(paymentRows)
    .onConflictDoUpdate({
      target: loanPayments.id,
      set: { status: sql`excluded.status`, updatedAt: sql`now()` },
    });

  logger.info(`Seeded 1 demo loan with ${paymentRows.length} payments`);
};

const seedDemoAiConversation = async () => {
  await db
    .insert(aiConversations)
    .values({
      id: DEMO_IDS.aiConversation,
      userId: DEMO_IDS.users.owner,
      familyId: DEMO_IDS.family,
      title: 'Can I afford a vacation this quarter?',
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Based on my spending, can I afford a ₹50,000 vacation in September?',
          createdAt: '2026-07-08T10:00:00.000Z',
        },
        {
          role: 'assistant',
          content:
            'Based on your average monthly savings of ₹22,000 over the last 3 months, ' +
            'you could comfortably set aside ₹50,000 by September if you pause the ' +
            'Dining Out budget overflow for two months.',
          createdAt: '2026-07-08T10:00:05.000Z',
        },
      ],
      lastMessageAt: new Date('2026-07-08T10:00:05.000Z'),
    })
    .onConflictDoUpdate({
      target: aiConversations.id,
      set: { messages: sql`excluded.messages`, updatedAt: sql`now()` },
    });

  logger.info('Seeded 1 demo AI conversation');
};

const seedDemoNotifications = async () => {
  const rows = [
    {
      id: DEMO_IDS.notifications.emiReminder,
      userId: DEMO_IDS.users.owner,
      familyId: DEMO_IDS.family,
      type: 'emi_reminder' as const,
      title: 'EMI due in 3 days',
      message: 'Your HDFC Bank home loan EMI of ₹18,500 is due on 5 Aug 2026.',
      data: { loanId: DEMO_IDS.loan },
      isRead: false,
    },
    {
      id: DEMO_IDS.notifications.budgetAlert,
      userId: DEMO_IDS.users.spouse,
      familyId: DEMO_IDS.family,
      type: 'budget_alert' as const,
      title: 'Groceries budget at 85%',
      message: "You've used 85% of the Family Groceries budget for July.",
      data: { budgetId: DEMO_IDS.budgets.groceries },
      isRead: false,
    },
  ];

  await db
    .insert(notifications)
    .values(rows)
    .onConflictDoUpdate({
      target: notifications.id,
      set: { message: sql`excluded.message`, updatedAt: sql`now()` },
    });

  logger.info(`Seeded ${rows.length} demo notifications`);
};

const seedDemoSubscription = async () => {
  await db
    .insert(subscriptions)
    .values({
      id: DEMO_IDS.subscription,
      userId: DEMO_IDS.users.owner,
      familyId: DEMO_IDS.family,
      plan: 'family',
      status: 'active',
      billingCycle: 'yearly',
      provider: 'razorpay',
      providerCustomerId: 'cust_demo_kumar',
      providerSubscriptionId: 'sub_demo_kumar_family',
      priceAmount: '2999.00',
      currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
      currentPeriodEnd: new Date('2026-12-31T23:59:59Z'),
    })
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: { status: sql`excluded.status`, updatedAt: sql`now()` },
    });

  logger.info('Seeded 1 demo subscription');
};

export const seedDemoFinanceData = async () => {
  await seedDemoAccounts();
  await seedDemoTransactions();
  await seedDemoBudgets();
  await seedDemoLoan();
  await seedDemoAiConversation();
  await seedDemoNotifications();
  await seedDemoSubscription();
};
