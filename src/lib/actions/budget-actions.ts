'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { assertAuthWrite } from '@/lib/actions/_shared/access';
import { revalidateFinanceCache } from '@/lib/ai/cache';
import { db } from '@/lib/db';
import { budgets } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';
import {
  type CreateBudgetInput,
  type UpdateBudgetInput,
  createBudgetSchema,
  updateBudgetSchema,
} from '@/lib/validations/budget';
import { type ActionResult } from '@/types';

import type { Budget } from '@/lib/db/schema/budgets';

const revalidate = (userId: string) => {
  revalidatePath('/', 'layout');
  revalidateFinanceCache(userId);
};

export const createBudgetAction = async (
  input: CreateBudgetInput
): Promise<ActionResult<Budget>> => {
  const parsed = createBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite(parsed.data.familyId);
    const data = parsed.data;

    const [budget] = await db
      .insert(budgets)
      .values({
        userId,
        familyId: data.familyId ?? null,
        categoryId: data.categoryId ?? null,
        name: data.name,
        amount: data.amount.toString(),
        currency: data.currency,
        period: data.period,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        rollover: data.rollover,
        alertThreshold: data.alertThreshold.toString(),
        notes: data.notes ?? null,
      })
      .returning();

    if (!budget) return { success: false, error: 'Failed to create budget' };

    revalidate(userId);
    return { success: true, data: budget };
  } catch (error) {
    logger.error('[createBudgetAction]', { error });
    return { success: false, error: 'Failed to create budget' };
  }
};

export const updateBudgetAction = async (
  input: UpdateBudgetInput
): Promise<ActionResult<Budget>> => {
  const parsed = updateBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite();
    const data = parsed.data;

    const existing = await db.query.budgets.findFirst({
      where: and(eq(budgets.id, data.id), eq(budgets.userId, userId)),
    });
    if (!existing) return { success: false, error: 'Budget not found' };

    const [updated] = await db
      .update(budgets)
      .set({
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.amount !== undefined && { amount: data.amount.toString() }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.period !== undefined && { period: data.period }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
        ...(data.rollover !== undefined && { rollover: data.rollover }),
        ...(data.alertThreshold !== undefined && {
          alertThreshold: data.alertThreshold.toString(),
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, data.id))
      .returning();

    if (!updated) return { success: false, error: 'Failed to update budget' };

    revalidate(userId);
    return { success: true, data: updated };
  } catch (error) {
    logger.error('[updateBudgetAction]', { error });
    return { success: false, error: 'Failed to update budget' };
  }
};

export const deleteBudgetAction = async (id: string): Promise<ActionResult<{ id: string }>> => {
  try {
    const { userId } = await assertAuthWrite();

    const existing = await db.query.budgets.findFirst({
      where: and(eq(budgets.id, id), eq(budgets.userId, userId)),
    });
    if (!existing) return { success: false, error: 'Budget not found' };

    await db.delete(budgets).where(eq(budgets.id, id));

    revalidate(userId);
    return { success: true, data: { id } };
  } catch (error) {
    logger.error('[deleteBudgetAction]', { error });
    return { success: false, error: 'Failed to delete budget' };
  }
};
