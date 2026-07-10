import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { type AccountSummary } from '@/types';

export const accountsQueryKeys = {
  all: ['accounts'] as const,
  list: () => [...accountsQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...accountsQueryKeys.all, 'detail', id] as const,
};

const fetchAccounts = async (): Promise<AccountSummary[]> => {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, balance, currency, color, icon, family_id')
    .eq('is_archived', false)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    type: row.type as AccountSummary['type'],
    balance: parseFloat(String(row.balance)),
    currency: row.currency as string,
    color: (row.color as string | null) ?? '#6366f1',
    icon: (row.icon as string | null) ?? 'wallet',
    familyId: (row.family_id as string | null) ?? null,
  }));
};

export const useAccounts = () =>
  useQuery({
    queryKey: accountsQueryKeys.list(),
    queryFn: fetchAccounts,
  });
