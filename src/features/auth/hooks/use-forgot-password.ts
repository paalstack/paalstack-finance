import { useMutation } from '@tanstack/react-query';

import { forgotPasswordAction } from '@/lib/actions/auth-actions';
import { type ForgotPasswordInput } from '@/lib/validations/auth';

export const useForgotPassword = () =>
  useMutation({
    mutationFn: async (input: ForgotPasswordInput) => {
      const result = await forgotPasswordAction(input);
      if (result?.error) throw new Error(result.error);
    },
  });
