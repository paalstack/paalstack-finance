import {
  boolean,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { categories } from './categories';
import { families } from './families';
import { profiles } from './profiles';

export const budgetPeriodEnum = pgEnum('budget_period', [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
]);

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').references(() => families.id, { onDelete: 'set null' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('INR'),
    period: budgetPeriodEnum('period').notNull().default('monthly'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }),
    rollover: boolean('rollover').notNull().default(false),
    alertThreshold: numeric('alert_threshold', { precision: 5, scale: 2 }).default('80'),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('budgets_user_id_idx').on(table.userId),
    index('budgets_family_id_idx').on(table.familyId),
    index('budgets_category_id_idx').on(table.categoryId),
    index('budgets_user_id_active_idx').on(table.userId, table.isActive),
  ]
);

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type BudgetPeriod = (typeof budgetPeriodEnum.enumValues)[number];
