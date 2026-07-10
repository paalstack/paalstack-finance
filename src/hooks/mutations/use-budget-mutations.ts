import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createBudgetAction,
  deleteBudgetAction,
  updateBudgetAction,
} from '@/lib/actions/budget-actions';
import { type CreateBudgetInput, type UpdateBudgetInput } from '@/lib/validations';

import { budgetsQueryKeys } from '../queries/use-budgets';

export const useCreateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const result = await createBudgetAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsQueryKeys.all }),
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBudgetInput) => {
      const result = await updateBudgetAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsQueryKeys.all }),
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteBudgetAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsQueryKeys.all }),
  });
};
