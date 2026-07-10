import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { toOneRelation } from '@/lib/utils';
import { type BudgetPeriod, type CategoryType } from '@/types';

export const budgetsQueryKeys = {
  all: ['budgets'] as const,
  list: () => [...budgetsQueryKeys.all, 'list'] as const,
  active: () => [...budgetsQueryKeys.all, 'active'] as const,
};

export type BudgetCategoryRef = {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: CategoryType;
};

export type BudgetRow = {
  id: string;
  family_id: string | null;
  category_id: string | null;
  name: string;
  amount: string;
  currency: string;
  period: BudgetPeriod;
  start_date: string;
  end_date: string | null;
  rollover: boolean;
  alert_threshold: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  categories: BudgetCategoryRef | null;
};

const fetchBudgets = async (activeOnly = true): Promise<BudgetRow[]> => {
  const supabase = createBrowserSupabaseClient();

  let query = supabase
    .from('budgets')
    .select(
      'id, family_id, category_id, name, amount, currency, period, start_date, end_date, rollover, alert_threshold, is_active, notes, created_at, updated_at, categories(id, name, color, icon, type)'
    )
    .order('created_at', { ascending: false });

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((budget) => ({
    ...budget,
    categories: toOneRelation(budget.categories),
  }));
};

export const useBudgets = (activeOnly = true) =>
  useQuery({
    queryKey: activeOnly ? budgetsQueryKeys.active() : budgetsQueryKeys.list(),
    queryFn: () => fetchBudgets(activeOnly),
  });
