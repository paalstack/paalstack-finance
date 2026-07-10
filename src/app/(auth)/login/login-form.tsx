'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Form, toast } from '@paalstack/react-ui';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { useLogin } from '@/features/auth';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';

export const LoginForm = () => {
  const router = useRouter();
  const { mutateAsync } = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const handleSubmit = async (data: LoginInput) => {
    try {
      await mutateAsync(data);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
    }
  };

  return (
    <Form
      form={form}
      onSubmit={handleSubmit}
      fields={[
        {
          type: 'input',
          name: 'email',
          label: 'Email',
          inputType: 'email',
          required: true,
          placeholder: 'you@example.com',
          inputProps: { autoComplete: 'email' },
        },
        {
          type: 'input',
          name: 'password',
          label: 'Password',
          inputType: 'password',
          required: true,
          inputProps: { autoComplete: 'current-password' },
        },
      ]}
      submitText="Sign in"
      hideResetButton
    />
  );
};
