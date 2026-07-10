import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { toOneRelation } from '@/lib/utils';
import { type RecurringFrequency, type TransactionType } from '@/types';

export const recurringTransactionsQueryKeys = {
  all: ['recurring-transactions'] as const,
  list: () => [...recurringTransactionsQueryKeys.all, 'list'] as const,
  active: () => [...recurringTransactionsQueryKeys.all, 'active'] as const,
};

export type RecurringTransactionCategoryRef = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

export type RecurringTransactionAccountRef = {
  id: string;
  name: string;
  currency: string;
};

export type RecurringTransactionRow = {
  id: string;
  account_id: string;
  category_id: string | null;
  to_account_id: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  notes: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  auto_post: boolean;
  created_at: string;
  updated_at: string;
  categories: RecurringTransactionCategoryRef | null;
  accounts: RecurringTransactionAccountRef | null;
};

const fetchRecurringTransactions = async (
  activeOnly = true
): Promise<RecurringTransactionRow[]> => {
  const supabase = createBrowserSupabaseClient();

  let query = supabase
    .from('recurring_transactions')
    .select(
      'id, account_id, category_id, to_account_id, type, amount, currency, notes, frequency, start_date, end_date, next_run_date, last_run_date, is_active, auto_post, created_at, updated_at, categories(id, name, color, icon), accounts(id, name, currency)'
    )
    .order('created_at', { ascending: false });

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((rt) => ({
    ...rt,
    categories: toOneRelation(rt.categories),
    accounts: toOneRelation(rt.accounts),
  }));
};

export const useRecurringTransactions = (activeOnly = true) =>
  useQuery({
    queryKey: activeOnly
      ? recurringTransactionsQueryKeys.active()
      : recurringTransactionsQueryKeys.list(),
    queryFn: () => fetchRecurringTransactions(activeOnly),
  });
