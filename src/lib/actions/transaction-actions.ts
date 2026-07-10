'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { assertAuthWrite } from '@/lib/actions/_shared/access';
import { applyBalanceEffect, reverseBalanceEffect } from '@/lib/actions/_shared/balance';
import { revalidateFinanceCache } from '@/lib/ai/cache';
import { db } from '@/lib/db';
import { accounts, transactions } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';
import {
  type CreateTransactionInput,
  type UpdateTransactionInput,
  createTransactionSchema,
  updateTransactionSchema,
} from '@/lib/validations/transaction';
import { type ActionResult } from '@/types';

import type { Transaction } from '@/lib/db/schema/transactions';

// Invalidates the AI assistant's cached spend aggregations (`lib/ai/cache.ts`)
// so a user never gets a stale answer right after logging a transaction.
const revalidate = (userId: string) => {
  revalidatePath('/', 'layout');
  revalidateFinanceCache(userId);
};

export const createTransactionAction = async (
  input: CreateTransactionInput
): Promise<ActionResult<Transaction>> => {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite(parsed.data.familyId);
    const data = parsed.data;

    const result = await db.transaction(async (tx) => {
      // Verify account ownership
      const account = await tx.query.accounts.findFirst({
        where: and(eq(accounts.id, data.accountId), eq(accounts.userId, userId)),
      });
      if (!account) return { success: false as const, error: 'Account not found' };

      if (data.type === 'transfer' && data.toAccountId) {
        const toAccount = await tx.query.accounts.findFirst({
          where: and(eq(accounts.id, data.toAccountId), eq(accounts.userId, userId)),
        });
        if (!toAccount) return { success: false as const, error: 'Destination account not found' };
      }

      const [transaction] = await tx
        .insert(transactions)
        .values({
          userId,
          familyId: data.familyId ?? null,
          accountId: data.accountId,
          categoryId: data.categoryId ?? null,
          toAccountId: data.toAccountId ?? null,
          type: data.type,
          status: data.status,
          amount: data.amount.toString(),
          currency: data.currency,
          description: data.description ?? null,
          notes: data.notes ?? null,
          transactionDate: data.date,
          isRecurring: data.isRecurring,
          tags: data.tags.length > 0 ? data.tags : null,
        })
        .returning();

      if (!transaction) return { success: false as const, error: 'Failed to create transaction' };

      if (data.status === 'completed') {
        await applyBalanceEffect(tx, {
          type: data.type,
          amount: data.amount,
          accountId: data.accountId,
          toAccountId: data.toAccountId,
        });
      }

      return { success: true as const, data: transaction };
    });

    if (result.success) revalidate(userId);
    return result;
  } catch (error) {
    logger.error('[createTransactionAction]', { error });
    return { success: false, error: 'Failed to create transaction' };
  }
};

export const updateTransactionAction = async (
  input: UpdateTransactionInput
): Promise<ActionResult<Transaction>> => {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite();
    const data = parsed.data;

    const result = await db.transaction(async (tx) => {
      const existing = await tx.query.transactions.findFirst({
        where: and(eq(transactions.id, data.id), eq(transactions.userId, userId)),
      });
      if (!existing) return { success: false as const, error: 'Transaction not found' };

      // Reverse the old effect if it was completed
      if (existing.status === 'completed') {
        await reverseBalanceEffect(tx, {
          type: existing.type,
          amount: parseFloat(existing.amount),
          accountId: existing.accountId,
          toAccountId: existing.toAccountId ?? undefined,
        });
      }

      const [updated] = await tx
        .update(transactions)
        .set({
          ...(data.accountId !== undefined && { accountId: data.accountId }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          ...(data.toAccountId !== undefined && { toAccountId: data.toAccountId }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.amount !== undefined && { amount: data.amount.toString() }),
          ...(data.currency !== undefined && { currency: data.currency }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.date !== undefined && { transactionDate: data.date }),
          ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
          ...(data.tags !== undefined && { tags: data.tags.length > 0 ? data.tags : null }),
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, data.id))
        .returning();

      if (!updated) return { success: false as const, error: 'Failed to update transaction' };

      // Apply new effect if completed
      const newStatus = data.status ?? existing.status;
      const newType = data.type ?? existing.type;
      const newAmount = data.amount ?? parseFloat(existing.amount);
      const newAccountId = data.accountId ?? existing.accountId;
      const newToAccountId = data.toAccountId ?? existing.toAccountId ?? undefined;

      if (newStatus === 'completed') {
        await applyBalanceEffect(tx, {
          type: newType,
          amount: newAmount,
          accountId: newAccountId,
          toAccountId: newToAccountId,
        });
      }

      return { success: true as const, data: updated };
    });

    if (result.success) revalidate(userId);
    return result;
  } catch (error) {
    logger.error('[updateTransactionAction]', { error });
    return { success: false, error: 'Failed to update transaction' };
  }
};

export const deleteTransactionAction = async (
  id: string
): Promise<ActionResult<{ id: string }>> => {
  try {
    const { userId } = await assertAuthWrite();

    const result = await db.transaction(async (tx) => {
      const existing = await tx.query.transactions.findFirst({
        where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
      });
      if (!existing) return { success: false as const, error: 'Transaction not found' };

      if (existing.status === 'completed') {
        await reverseBalanceEffect(tx, {
          type: existing.type,
          amount: parseFloat(existing.amount),
          accountId: existing.accountId,
          toAccountId: existing.toAccountId ?? undefined,
        });
      }

      await tx.delete(transactions).where(eq(transactions.id, id));
      return { success: true as const, data: { id } };
    });

    if (result.success) revalidate(userId);
    return result;
  } catch (error) {
    logger.error('[deleteTransactionAction]', { error });
    return { success: false, error: 'Failed to delete transaction' };
  }
};
