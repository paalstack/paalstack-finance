'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Form, toast, TypographyP } from '@paalstack/react-ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useSignup } from '@/features/auth';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';

export const SignupForm = () => {
  const [success, setSuccess] = useState(false);
  const { mutateAsync } = useSignup();

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const handleSubmit = async (data: SignupInput) => {
    try {
      await mutateAsync(data);
      setSuccess(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
    }
  };

  if (success) {
    return (
      <TypographyP className="text-center text-sm">
        Check your email to confirm your account.
      </TypographyP>
    );
  }

  return (
    <Form
      form={form}
      onSubmit={handleSubmit}
      fields={[
        {
          type: 'input',
          name: 'full_name',
          label: 'Full name',
          required: true,
          inputProps: { autoComplete: 'name' },
        },
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
          inputProps: { autoComplete: 'new-password' },
        },
        {
          type: 'input',
          name: 'confirm_password',
          label: 'Confirm password',
          inputType: 'password',
          required: true,
          inputProps: { autoComplete: 'new-password' },
        },
      ]}
      submitText="Create account"
      hideResetButton
    />
  );
};
