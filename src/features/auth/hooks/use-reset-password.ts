import { useMutation } from '@tanstack/react-query';

import { resetPasswordAction } from '@/lib/actions/auth-actions';
import { type ResetPasswordInput } from '@/lib/validations/auth';

export const useResetPassword = () =>
  useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      const result = await resetPasswordAction(input);
      if (result?.error) throw new Error(result.error);
    },
  });
