import { unstable_cache, updateTag } from 'next/cache';

/**
 * Per-user cache tag for the spend/budget/EMI aggregation queries backing
 * the AI tools (`lib/ai/tools.ts`). A short `revalidate` window bounds
 * staleness even if a call site forgets to invalidate, but the real
 * correctness guarantee is `revalidateFinanceCache` — call it from every
 * mutation that changes transactions/budgets/loans (see the transaction,
 * budget, and loan Server Actions) so a user never gets a stale answer to
 * "how much did I spend" right after logging a new expense.
 */
export const getFinanceCacheTag = (userId: string): string => `finance:${userId}`;

/**
 * Uses `updateTag` (not `revalidateTag`) because every call site is a
 * Server Action mutating the user's own data — this is exactly the
 * read-your-own-writes case `updateTag` exists for: the tag expires
 * immediately instead of serving one more stale response under
 * stale-while-revalidate semantics.
 */
export const revalidateFinanceCache = (userId: string): void => {
  updateTag(getFinanceCacheTag(userId));
};

/** Wraps an aggregation query with a 60s cache scoped to one user, tagged for on-write invalidation. */
export const cacheFinanceQuery = <Args extends unknown[], Result>(
  userId: string,
  keyPrefix: string,
  fn: (...args: Args) => Promise<Result>
) =>
  unstable_cache(fn, [keyPrefix, userId], {
    tags: [getFinanceCacheTag(userId)],
    revalidate: 60,
  });
