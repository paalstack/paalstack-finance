import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createRecurringTransactionAction,
  deleteRecurringTransactionAction,
  postRecurringTransactionNowAction,
  updateRecurringTransactionAction,
} from '@/lib/actions/recurring-transaction-actions';
import {
  type CreateRecurringTransactionInput,
  type UpdateRecurringTransactionInput,
} from '@/lib/validations';

import { accountsQueryKeys } from '../queries/use-accounts';
import { recurringTransactionsQueryKeys } from '../queries/use-recurring-transactions';
import { transactionsQueryKeys } from '../queries/use-transactions';

export const useCreateRecurringTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRecurringTransactionInput) => {
      const result = await createRecurringTransactionAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recurringTransactionsQueryKeys.all }),
  });
};

export const useUpdateRecurringTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRecurringTransactionInput) => {
      const result = await updateRecurringTransactionAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recurringTransactionsQueryKeys.all }),
  });
};

export const useDeleteRecurringTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteRecurringTransactionAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recurringTransactionsQueryKeys.all }),
  });
};

export const usePostRecurringTransactionNow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await postRecurringTransactionNowAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recurringTransactionsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: accountsQueryKeys.all }),
      ]);
    },
  });
};
