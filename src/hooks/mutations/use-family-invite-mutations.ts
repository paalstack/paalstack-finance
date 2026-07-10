import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  acceptFamilyInviteAction,
  createFamilyInviteAction,
  resendFamilyInviteAction,
  revokeFamilyInviteAction,
} from '@/lib/actions/family-actions';
import {
  type AcceptFamilyInviteInput,
  type CreateFamilyInviteInput,
  type ResendFamilyInviteInput,
  type RevokeFamilyInviteInput,
} from '@/lib/validations/family';

import { familyQueryKeys } from '../queries/use-family';
import { familyActivityQueryKeys } from '../queries/use-family-activity';
import { familyInvitesQueryKeys } from '../queries/use-family-invites';

export const useCreateFamilyInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFamilyInviteInput) => {
      const result = await createFamilyInviteAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: familyInvitesQueryKeys.list(variables.familyId),
      });
      void queryClient.invalidateQueries({
        queryKey: familyActivityQueryKeys.list(variables.familyId, 20),
      });
    },
  });
};

export const useRevokeFamilyInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RevokeFamilyInviteInput) => {
      const result = await revokeFamilyInviteAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: familyInvitesQueryKeys.list(variables.familyId),
      });
      void queryClient.invalidateQueries({
        queryKey: familyActivityQueryKeys.list(variables.familyId, 20),
      });
    },
  });
};

export const useResendFamilyInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ResendFamilyInviteInput) => {
      const result = await resendFamilyInviteAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: familyInvitesQueryKeys.list(variables.familyId),
      });
    },
  });
};

export const useAcceptFamilyInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AcceptFamilyInviteInput) => {
      const result = await acceptFamilyInviteAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: familyQueryKeys.all });
    },
  });
};
