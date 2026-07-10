import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { type CategoryType } from '@/types';

export const categoriesQueryKeys = {
  all: ['categories'] as const,
  list: (type?: CategoryType) => [...categoriesQueryKeys.all, 'list', type] as const,
};

export type CategoryRow = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  type: CategoryType;
  color: string;
  icon: string;
  is_system: boolean;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const fetchCategories = async (type?: CategoryType): Promise<CategoryRow[]> => {
  const supabase = createBrowserSupabaseClient();

  let query = supabase
    .from('categories')
    .select(
      'id, user_id, name, slug, type, color, icon, is_system, parent_id, sort_order, created_at, updated_at'
    )
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const useCategories = (type?: CategoryType) =>
  useQuery({
    queryKey: categoriesQueryKeys.list(type),
    queryFn: () => fetchCategories(type),
  });
