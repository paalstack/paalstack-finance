import { date, index, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { loans } from './loans';
import { transactions } from './transactions';

export const loanPaymentStatusEnum = pgEnum('loan_payment_status', [
  'pending',
  'paid',
  'late',
  'missed',
]);

export const loanPayments = pgTable(
  'loan_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    loanId: uuid('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),
    transactionId: uuid('transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    principalComponent: numeric('principal_component', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    interestComponent: numeric('interest_component', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    lateFee: numeric('late_fee', { precision: 15, scale: 2 }).notNull().default('0'),
    paymentDate: date('payment_date').notNull(),
    status: loanPaymentStatusEnum('status').notNull().default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('loan_payments_loan_id_idx').on(table.loanId),
    index('loan_payments_transaction_id_idx').on(table.transactionId),
    index('loan_payments_payment_date_idx').on(table.paymentDate),
    index('loan_payments_status_idx').on(table.status),
    index('loan_payments_loan_id_payment_date_idx').on(table.loanId, table.paymentDate),
  ]
);

export type LoanPayment = typeof loanPayments.$inferSelect;
export type NewLoanPayment = typeof loanPayments.$inferInsert;
export type LoanPaymentStatus = (typeof loanPaymentStatusEnum.enumValues)[number];
