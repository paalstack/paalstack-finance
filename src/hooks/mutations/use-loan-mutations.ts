import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createLoanAction,
  createLoanPaymentAction,
  updateLoanAction,
} from '@/lib/actions/loan-actions';
import {
  type CreateLoanInput,
  type CreateLoanPaymentInput,
  type UpdateLoanInput,
} from '@/lib/validations';

import { accountsQueryKeys } from '../queries/use-accounts';
import { loansQueryKeys } from '../queries/use-loans';
import { transactionsQueryKeys } from '../queries/use-transactions';

export const useCreateLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLoanInput) => {
      const result = await createLoanAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loansQueryKeys.all }),
  });
};

export const useUpdateLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateLoanInput) => {
      const result = await updateLoanAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loansQueryKeys.all }),
  });
};

export const useCreateLoanPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, input }: { loanId: string; input: CreateLoanPaymentInput }) => {
      const result = await createLoanPaymentAction(loanId, input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: async (_data, { loanId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: loansQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: loansQueryKeys.payments(loanId) }),
        queryClient.invalidateQueries({ queryKey: accountsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionsQueryKeys.all }),
      ]);
    },
  });
};
