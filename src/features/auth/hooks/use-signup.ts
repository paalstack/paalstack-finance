import { useMutation } from '@tanstack/react-query';

import { signUpAction } from '@/lib/actions/auth-actions';
import { type SignupInput } from '@/lib/validations/auth';

export const useSignup = () =>
  useMutation({
    mutationFn: async (input: SignupInput) => {
      const result = await signUpAction(input);
      if (result?.error) throw new Error(result.error);
    },
  });
