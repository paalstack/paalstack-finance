'use server';

import { addDays, addMonths, addWeeks, addYears } from 'date-fns';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { assertAuthWrite } from '@/lib/actions/_shared/access';
import { applyBalanceEffect } from '@/lib/actions/_shared/balance';
import { db } from '@/lib/db';
import { accounts, recurringTransactions, transactions } from '@/lib/db/schema';
import { toISODateString } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import {
  type CreateRecurringTransactionInput,
  type UpdateRecurringTransactionInput,
  type RecurringFrequencyValue,
  createRecurringTransactionSchema,
  updateRecurringTransactionSchema,
} from '@/lib/validations/recurring-transaction';
import { type ActionResult } from '@/types';

import type { RecurringTransaction } from '@/lib/db/schema/recurring-transactions';
import type { Transaction } from '@/lib/db/schema/transactions';

const revalidate = () => revalidatePath('/', 'layout');

const computeNextRunDate = (from: Date, frequency: RecurringFrequencyValue): string => {
  switch (frequency) {
    case 'daily':
      return toISODateString(addDays(from, 1));
    case 'weekly':
      return toISODateString(addWeeks(from, 1));
    case 'biweekly':
      return toISODateString(addWeeks(from, 2));
    case 'monthly':
      return toISODateString(addMonths(from, 1));
    case 'yearly':
      return toISODateString(addYears(from, 1));
  }
};

export const createRecurringTransactionAction = async (
  input: CreateRecurringTransactionInput
): Promise<ActionResult<RecurringTransaction>> => {
  const parsed = createRecurringTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite();
    const data = parsed.data;

    const startDate = new Date(data.startDate);
    const nextRunDate = computeNextRunDate(startDate, data.frequency);

    const [recurring] = await db
      .insert(recurringTransactions)
      .values({
        userId,
        accountId: data.accountId,
        categoryId: data.categoryId ?? null,
        toAccountId: data.toAccountId ?? null,
        type: data.type,
        amount: data.amount.toString(),
        currency: data.currency,
        notes: data.notes ?? null,
        frequency: data.frequency,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        nextRunDate,
        autoPost: data.autoPost,
      })
      .returning();

    if (!recurring) return { success: false, error: 'Failed to create recurring transaction' };

    revalidate();
    return { success: true, data: recurring };
  } catch (error) {
    logger.error('[createRecurringTransactionAction]', { error });
    return { success: false, error: 'Failed to create recurring transaction' };
  }
};

export const updateRecurringTransactionAction = async (
  input: UpdateRecurringTransactionInput
): Promise<ActionResult<RecurringTransaction>> => {
  const parsed = updateRecurringTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite();
    const data = parsed.data;

    const existing = await db.query.recurringTransactions.findFirst({
      where: and(eq(recurringTransactions.id, data.id), eq(recurringTransactions.userId, userId)),
    });
    if (!existing) return { success: false, error: 'Recurring transaction not found' };

    // Recompute nextRunDate if frequency or startDate changed
    let nextRunDate: string | undefined;
    if (data.frequency || data.startDate) {
      const freq = data.frequency ?? existing.frequency;
      const start = new Date(data.startDate ?? existing.startDate);
      nextRunDate = computeNextRunDate(start, freq);
    }

    const [updated] = await db
      .update(recurringTransactions)
      .set({
        ...(data.accountId !== undefined && { accountId: data.accountId }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.toAccountId !== undefined && { toAccountId: data.toAccountId }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.amount !== undefined && { amount: data.amount.toString() }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.autoPost !== undefined && { autoPost: data.autoPost }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(nextRunDate !== undefined && { nextRunDate }),
        updatedAt: new Date(),
      })
      .where(eq(recurringTransactions.id, data.id))
      .returning();

    if (!updated) return { success: false, error: 'Failed to update recurring transaction' };

    revalidate();
    return { success: true, data: updated };
  } catch (error) {
    logger.error('[updateRecurringTransactionAction]', { error });
    return { success: false, error: 'Failed to update recurring transaction' };
  }
};

export const deleteRecurringTransactionAction = async (
  id: string
): Promise<ActionResult<{ id: string }>> => {
  try {
    const { userId } = await assertAuthWrite();

    const existing = await db.query.recurringTransactions.findFirst({
      where: and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)),
    });
    if (!existing) return { success: false, error: 'Recurring transaction not found' };

    // Soft-delete: set isActive false
    await db
      .update(recurringTransactions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, id));

    revalidate();
    return { success: true, data: { id } };
  } catch (error) {
    logger.error('[deleteRecurringTransactionAction]', { error });
    return { success: false, error: 'Failed to delete recurring transaction' };
  }
};

export const postRecurringTransactionNowAction = async (
  id: string
): Promise<
  ActionResult<{ recurringTransaction: RecurringTransaction; transaction: Transaction }>
> => {
  try {
    const { userId } = await assertAuthWrite();

    const result = await db.transaction(async (tx) => {
      const recurring = await tx.query.recurringTransactions.findFirst({
        where: and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)),
      });
      if (!recurring) return { success: false as const, error: 'Recurring transaction not found' };

      const account = await tx.query.accounts.findFirst({
        where: and(eq(accounts.id, recurring.accountId), eq(accounts.userId, userId)),
      });
      if (!account) return { success: false as const, error: 'Account not found' };

      const today = toISODateString(new Date());

      const [transaction] = await tx
        .insert(transactions)
        .values({
          userId,
          accountId: recurring.accountId,
          categoryId: recurring.categoryId ?? null,
          toAccountId: recurring.toAccountId ?? null,
          type: recurring.type,
          status: 'completed',
          amount: recurring.amount,
          currency: recurring.currency,
          notes: recurring.notes ?? null,
          transactionDate: today,
          isRecurring: true,
          recurringId: recurring.id,
        })
        .returning();

      if (!transaction) return { success: false as const, error: 'Failed to create transaction' };

      await applyBalanceEffect(tx, {
        type: recurring.type,
        amount: parseFloat(recurring.amount),
        accountId: recurring.accountId,
        toAccountId: recurring.toAccountId ?? undefined,
      });

      const nextRunDate = computeNextRunDate(new Date(recurring.nextRunDate), recurring.frequency);

      const [updatedRecurring] = await tx
        .update(recurringTransactions)
        .set({ lastRunDate: today, nextRunDate, updatedAt: new Date() })
        .where(eq(recurringTransactions.id, id))
        .returning();

      if (!updatedRecurring)
        return { success: false as const, error: 'Failed to advance schedule' };

      return {
        success: true as const,
        data: { recurringTransaction: updatedRecurring, transaction },
      };
    });

    if (result.success) revalidate();
    return result;
  } catch (error) {
    logger.error('[postRecurringTransactionNowAction]', { error });
    return { success: false, error: 'Failed to post recurring transaction' };
  }
};
