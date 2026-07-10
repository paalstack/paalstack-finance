import { useMutation } from '@tanstack/react-query';

import { signInAction } from '@/lib/actions/auth-actions';
import { type LoginInput } from '@/lib/validations/auth';

export const useLogin = () =>
  useMutation({
    mutationFn: async (input: LoginInput) => {
      const result = await signInAction(input);
      if (result?.error) throw new Error(result.error);
    },
  });
