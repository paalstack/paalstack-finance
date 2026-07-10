import {
  boolean,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts';
import { categories } from './categories';
import { profiles } from './profiles';
import { transactionTypeEnum } from './transactions';

export const recurringFrequencyEnum = pgEnum('recurring_frequency', [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'yearly',
]);

export const recurringTransactions = pgTable(
  'recurring_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    toAccountId: uuid('to_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    type: transactionTypeEnum('type').notNull(),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('INR'),
    notes: text('notes'),
    frequency: recurringFrequencyEnum('frequency').notNull().default('monthly'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    nextRunDate: date('next_run_date').notNull(),
    lastRunDate: date('last_run_date'),
    isActive: boolean('is_active').notNull().default(true),
    autoPost: boolean('auto_post').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('recurring_transactions_user_id_idx').on(table.userId),
    index('recurring_transactions_account_id_idx').on(table.accountId),
    index('recurring_transactions_category_id_idx').on(table.categoryId),
    index('recurring_transactions_next_run_date_idx').on(table.nextRunDate),
    index('recurring_transactions_user_id_active_idx').on(table.userId, table.isActive),
  ]
);

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;
export type RecurringFrequency = (typeof recurringFrequencyEnum.enumValues)[number];
