import { eq, sql } from 'drizzle-orm';

import { type db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';

type BalanceEffect = {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  accountId: string;
  toAccountId?: string;
};

/**
 * Apply a balance effect atomically within a Drizzle transaction.
 * income  → +amount on accountId
 * expense → -amount on accountId
 * transfer → -amount on accountId, +amount on toAccountId
 */
export const applyBalanceEffect = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  effect: BalanceEffect
): Promise<void> => {
  const { type, amount, accountId, toAccountId } = effect;

  if (type === 'income') {
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount.toString()}` })
      .where(eq(accounts.id, accountId));
  } else if (type === 'expense') {
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount.toString()}` })
      .where(eq(accounts.id, accountId));
  } else if (type === 'transfer') {
    if (!toAccountId) throw new Error('Transfer requires toAccountId');
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount.toString()}` })
      .where(eq(accounts.id, accountId));
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount.toString()}` })
      .where(eq(accounts.id, toAccountId));
  }
};

/**
 * Reverse a previously applied balance effect (used on update/delete).
 * Applies the inverse of applyBalanceEffect.
 */
export const reverseBalanceEffect = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  effect: BalanceEffect
): Promise<void> => {
  const { type, amount, accountId, toAccountId } = effect;

  if (type === 'income') {
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount.toString()}` })
      .where(eq(accounts.id, accountId));
  } else if (type === 'expense') {
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount.toString()}` })
      .where(eq(accounts.id, accountId));
  } else if (type === 'transfer') {
    if (!toAccountId) throw new Error('Transfer reversal requires toAccountId');
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount.toString()}` })
      .where(eq(accounts.id, accountId));
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount.toString()}` })
      .where(eq(accounts.id, toAccountId));
  }
};
