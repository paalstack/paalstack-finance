import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createCategoryAction, deleteCategoryAction } from '@/lib/actions/category-actions';
import { type CreateCategoryInput } from '@/lib/validations';

import { categoriesQueryKeys } from '../queries/use-categories';

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const result = await createCategoryAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all }),
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCategoryAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all }),
  });
};
