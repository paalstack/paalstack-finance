import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { toOneRelation } from '@/lib/utils';
import { type TransactionFilter, type TransactionStatus, type TransactionType } from '@/types';

export const transactionsQueryKeys = {
  all: ['transactions'] as const,
  list: (filter?: TransactionFilter) => [...transactionsQueryKeys.all, 'list', filter] as const,
  detail: (id: string) => [...transactionsQueryKeys.all, 'detail', id] as const,
};

export type TransactionCategoryRef = {
  name: string;
  color: string;
  icon: string;
};

export type TransactionAccountRef = {
  name: string;
  currency: string;
};

export type TransactionRow = {
  id: string;
  family_id: string | null;
  account_id: string;
  category_id: string | null;
  to_account_id: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  currency: string;
  description: string | null;
  notes: string | null;
  transaction_date: string;
  is_recurring: boolean;
  recurring_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  categories: TransactionCategoryRef | null;
  accounts: TransactionAccountRef | null;
};

const fetchTransactions = async (filter: TransactionFilter = {}): Promise<TransactionRow[]> => {
  const supabase = createBrowserSupabaseClient();

  let query = supabase
    .from('transactions')
    .select(
      'id, family_id, account_id, category_id, to_account_id, type, status, amount, currency, description, notes, transaction_date, is_recurring, recurring_id, tags, created_at, updated_at, categories(name, color, icon), accounts(name, currency)'
    )
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filter.accountId) query = query.eq('account_id', filter.accountId);
  if (filter.categoryId) query = query.eq('category_id', filter.categoryId);
  if (filter.type) query = query.eq('type', filter.type);
  if (filter.status) query = query.eq('status', filter.status);
  if (filter.dateRange) {
    query = query
      .gte('transaction_date', filter.dateRange.from.toISOString().slice(0, 10))
      .lte('transaction_date', filter.dateRange.to.toISOString().slice(0, 10));
  }
  if (filter.minAmount !== undefined) query = query.gte('amount', filter.minAmount);
  if (filter.maxAmount !== undefined) query = query.lte('amount', filter.maxAmount);
  if (filter.search) {
    query = query.or(`description.ilike.%${filter.search}%,notes.ilike.%${filter.search}%`);
  }
  if (filter.tags && filter.tags.length > 0) {
    query = query.overlaps('tags', filter.tags);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((tx) => ({
    ...tx,
    categories: toOneRelation(tx.categories),
    accounts: toOneRelation(tx.accounts),
  }));
};

export const useTransactions = (filter?: TransactionFilter) =>
  useQuery({
    queryKey: transactionsQueryKeys.list(filter),
    queryFn: () => fetchTransactions(filter),
  });
