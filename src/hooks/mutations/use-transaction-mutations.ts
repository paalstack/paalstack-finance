import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from '@/lib/actions/transaction-actions';
import { type CreateTransactionInput, type UpdateTransactionInput } from '@/lib/validations';

import { accountsQueryKeys } from '../queries/use-accounts';
import { transactionsQueryKeys } from '../queries/use-transactions';

const invalidateAll = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: transactionsQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: accountsQueryKeys.all }),
  ]);
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const result = await createTransactionAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTransactionInput) => {
      const result = await updateTransactionAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTransactionAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};
