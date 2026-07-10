'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Form, toast, TypographyP } from '@paalstack/react-ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useForgotPassword } from '@/features/auth';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth';

export const ForgotPasswordForm = () => {
  const [success, setSuccess] = useState(false);
  const { mutateAsync } = useForgotPassword();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const handleSubmit = async (data: ForgotPasswordInput) => {
    try {
      await mutateAsync(data);
      setSuccess(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset link');
    }
  };

  if (success) {
    return (
      <TypographyP className="text-center text-sm">Reset link sent. Check your email.</TypographyP>
    );
  }

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
      ]}
      submitText="Send reset link"
      hideResetButton
    />
  );
};
