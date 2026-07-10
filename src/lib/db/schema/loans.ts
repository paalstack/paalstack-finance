import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts';
import { families } from './families';
import { profiles } from './profiles';

export const loanTypeEnum = pgEnum('loan_type', [
  'personal',
  'home',
  'auto',
  'education',
  'credit_card',
  'others',
]);

export const loanStatusEnum = pgEnum('loan_status', [
  'active',
  'closed',
  'defaulted',
  'foreclosed',
]);

export const loans = pgTable(
  'loans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').references(() => families.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    lender: text('lender').notNull(),
    type: loanTypeEnum('type').notNull().default('personal'),
    principal: numeric('principal', { precision: 15, scale: 2 }).notNull(),
    interestRate: numeric('interest_rate', { precision: 5, scale: 2 }).notNull(),
    emiAmount: numeric('emi_amount', { precision: 15, scale: 2 }).notNull(),
    tenureMonths: integer('tenure_months').notNull(),
    startDate: date('start_date').notNull(),
    dueDate: date('due_date').notNull(),
    remainingBalance: numeric('remaining_balance', { precision: 15, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('INR'),
    status: loanStatusEnum('status').notNull().default('active'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('loans_user_id_idx').on(table.userId),
    index('loans_family_id_idx').on(table.familyId),
    index('loans_account_id_idx').on(table.accountId),
    index('loans_status_idx').on(table.status),
    index('loans_due_date_idx').on(table.dueDate),
    index('loans_user_id_status_idx').on(table.userId, table.status),
  ]
);

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;
export type LoanType = (typeof loanTypeEnum.enumValues)[number];
export type LoanStatus = (typeof loanStatusEnum.enumValues)[number];
