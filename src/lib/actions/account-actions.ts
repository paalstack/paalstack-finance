'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { assertAuthWrite } from '@/lib/actions/_shared/access';
import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';
import { type CreateAccountInput, createAccountSchema } from '@/lib/validations/account';
import { type ActionResult } from '@/types';

import type { Account } from '@/lib/db/schema/accounts';

const revalidate = () => revalidatePath('/', 'layout');

export const createAccountAction = async (
  input: CreateAccountInput
): Promise<ActionResult<Account>> => {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { userId } = await assertAuthWrite(parsed.data.familyId);
    const data = parsed.data;

    // If isDefault, unset all existing defaults for this user first
    if (data.isDefault) {
      await db
        .update(accounts)
        .set({ isDefault: false })
        .where(and(eq(accounts.userId, userId), eq(accounts.isDefault, true)));
    }

    const [account] = await db
      .insert(accounts)
      .values({
        userId,
        name: data.name,
        type: data.type,
        balance: data.balance.toString(),
        currency: data.currency,
        color: data.color,
        icon: data.icon,
        isDefault: data.isDefault,
        notes: data.notes ?? null,
        familyId: data.familyId ?? null,
      })
      .returning();

    if (!account) return { success: false, error: 'Failed to create account' };

    revalidate();
    return { success: true, data: account };
  } catch (error) {
    logger.error('[createAccountAction]', { error });
    return { success: false, error: 'Failed to create account' };
  }
};

export const archiveAccountAction = async (id: string): Promise<ActionResult<{ id: string }>> => {
  try {
    const { userId } = await assertAuthWrite();

    const existing = await db.query.accounts.findFirst({
      where: and(eq(accounts.id, id), eq(accounts.userId, userId)),
    });
    if (!existing) return { success: false, error: 'Account not found' };

    await db
      .update(accounts)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(accounts.id, id));

    revalidate();
    return { success: true, data: { id } };
  } catch (error) {
    logger.error('[archiveAccountAction]', { error });
    return { success: false, error: 'Failed to archive account' };
  }
};
