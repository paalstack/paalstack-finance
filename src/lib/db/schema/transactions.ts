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
import { families } from './families';
import { profiles } from './profiles';

export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense', 'transfer']);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'completed',
  'cancelled',
]);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').references(() => families.id, { onDelete: 'set null' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    toAccountId: uuid('to_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').notNull().default('completed'),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('INR'),
    description: text('description'),
    notes: text('notes'),
    transactionDate: date('transaction_date').notNull(),
    isRecurring: boolean('is_recurring').notNull().default(false),
    recurringId: uuid('recurring_id'),
    tags: text('tags').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_family_id_idx').on(table.familyId),
    index('transactions_account_id_idx').on(table.accountId),
    index('transactions_category_id_idx').on(table.categoryId),
    index('transactions_transaction_date_idx').on(table.transactionDate),
    index('transactions_recurring_id_idx').on(table.recurringId),
    index('transactions_user_id_transaction_date_idx').on(table.userId, table.transactionDate),
    index('transactions_user_id_type_idx').on(table.userId, table.type),
    index('transactions_family_id_transaction_date_idx').on(table.familyId, table.transactionDate),
  ]
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type TransactionStatus = (typeof transactionStatusEnum.enumValues)[number];
