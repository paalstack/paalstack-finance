import { useMutation, useQueryClient } from '@tanstack/react-query';

import { archiveAccountAction, createAccountAction } from '@/lib/actions/account-actions';
import { type CreateAccountInput } from '@/lib/validations';

import { accountsQueryKeys } from '../queries/use-accounts';
import { transactionsQueryKeys } from '../queries/use-transactions';

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const result = await createAccountAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountsQueryKeys.all }),
  });
};

export const useArchiveAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await archiveAccountAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionsQueryKeys.all }),
      ]);
    },
  });
};
