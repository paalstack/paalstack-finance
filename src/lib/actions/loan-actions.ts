'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { assertAuthWrite } from '@/lib/actions/_shared/access';
import { applyBalanceEffect } from '@/lib/actions/_shared/balance';
import { revalidateFinanceCache } from '@/lib/ai/cache';
import { db } from '@/lib/db';
import { accounts, loanPayments, loans, transactions } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';
import {
  type CreateLoanInput,
  type CreateLoanPaymentInput,
  type UpdateLoanInput,
  createLoanPaymentSchema,
  createLoanSchema,
  updateLoanSchema,
} from '@/lib/validations/loan';
import { type ActionResult } from '@/types';

import type { LoanPayment } from '@/lib/db/schema/loan-payments';
import type { Loan } from '@/lib/db/schema/loans';

const revalidate = (userId: string) => {
  revalidatePath('/', 'layout');
  revalidateFinanceCache(userId);
};

export const createLoanAction = async (input: CreateLoanInput): Promise<ActionResult<Loan>> => {
  const parsed = createLoanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite(parsed.data.familyId);
    const data = parsed.data;

    const [loan] = await db
      .insert(loans)
      .values({
        userId,
        familyId: data.familyId ?? null,
        accountId: data.accountId ?? null,
        lender: data.lender,
        type: data.type,
        principal: data.principal.toString(),
        interestRate: data.interestRate.toString(),
        emiAmount: data.emiAmount.toString(),
        tenureMonths: data.tenureMonths,
        startDate: data.startDate,
        dueDate: data.dueDate,
        remainingBalance: data.remainingBalance.toString(),
        currency: data.currency,
        notes: data.notes ?? null,
      })
      .returning();

    if (!loan) return { success: false, error: 'Failed to create loan' };

    revalidate(userId);
    return { success: true, data: loan };
  } catch (error) {
    logger.error('[createLoanAction]', { error });
    return { success: false, error: 'Failed to create loan' };
  }
};

export const updateLoanAction = async (input: UpdateLoanInput): Promise<ActionResult<Loan>> => {
  const parsed = updateLoanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite();
    const data = parsed.data;

    const existing = await db.query.loans.findFirst({
      where: and(eq(loans.id, data.id), eq(loans.userId, userId)),
    });
    if (!existing) return { success: false, error: 'Loan not found' };

    const [updated] = await db
      .update(loans)
      .set({
        ...(data.lender !== undefined && { lender: data.lender }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.principal !== undefined && { principal: data.principal.toString() }),
        ...(data.interestRate !== undefined && { interestRate: data.interestRate.toString() }),
        ...(data.emiAmount !== undefined && { emiAmount: data.emiAmount.toString() }),
        ...(data.tenureMonths !== undefined && { tenureMonths: data.tenureMonths }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.remainingBalance !== undefined && {
          remainingBalance: data.remainingBalance.toString(),
        }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.accountId !== undefined && { accountId: data.accountId }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date(),
      })
      .where(eq(loans.id, data.id))
      .returning();

    if (!updated) return { success: false, error: 'Failed to update loan' };

    revalidate(userId);
    return { success: true, data: updated };
  } catch (error) {
    logger.error('[updateLoanAction]', { error });
    return { success: false, error: 'Failed to update loan' };
  }
};

export const createLoanPaymentAction = async (
  loanId: string,
  input: CreateLoanPaymentInput
): Promise<ActionResult<LoanPayment>> => {
  const parsed = createLoanPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite();
    const data = parsed.data;

    const result = await db.transaction(async (tx) => {
      const loan = await tx.query.loans.findFirst({
        where: and(eq(loans.id, loanId), eq(loans.userId, userId)),
      });
      if (!loan) return { success: false as const, error: 'Loan not found' };

      let linkedTransactionId: string | null = null;

      // Optionally create a linked expense transaction
      if (data.postTransaction && loan.accountId) {
        const account = await tx.query.accounts.findFirst({
          where: eq(accounts.id, loan.accountId),
        });
        if (!account) return { success: false as const, error: 'Linked account not found' };

        const [txRow] = await tx
          .insert(transactions)
          .values({
            userId,
            accountId: loan.accountId,
            type: 'expense',
            status: 'completed',
            amount: data.amount.toString(),
            currency: loan.currency,
            description: `EMI payment - ${loan.lender}`,
            transactionDate: data.paymentDate,
            isRecurring: false,
          })
          .returning();

        if (txRow) {
          linkedTransactionId = txRow.id;
          await applyBalanceEffect(tx, {
            type: 'expense',
            amount: data.amount,
            accountId: loan.accountId,
          });
        }
      }

      const [payment] = await tx
        .insert(loanPayments)
        .values({
          loanId,
          transactionId: linkedTransactionId,
          amount: data.amount.toString(),
          principalComponent: data.principalComponent.toString(),
          interestComponent: data.interestComponent.toString(),
          lateFee: data.lateFee.toString(),
          paymentDate: data.paymentDate,
          status: data.status,
          notes: data.notes ?? null,
        })
        .returning();

      if (!payment) return { success: false as const, error: 'Failed to record payment' };

      // Decrement remaining balance by principal component when paid
      if (data.status === 'paid' && data.principalComponent > 0) {
        await tx
          .update(loans)
          .set({
            remainingBalance: `${parseFloat(loan.remainingBalance) - data.principalComponent}`,
            updatedAt: new Date(),
          })
          .where(eq(loans.id, loanId));
      }

      return { success: true as const, data: payment };
    });

    if (result.success) revalidate(userId);
    return result;
  } catch (error) {
    logger.error('[createLoanPaymentAction]', { error });
    return { success: false, error: 'Failed to record loan payment' };
  }
};
