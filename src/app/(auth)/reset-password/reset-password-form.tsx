'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Form, toast } from '@paalstack/react-ui';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { useResetPassword } from '@/features/auth';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth';

export const ResetPasswordForm = () => {
  const router = useRouter();
  const { mutateAsync } = useResetPassword();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const handleSubmit = async (data: ResetPasswordInput) => {
    try {
      await mutateAsync(data);
      toast.success('Password updated. Please sign in again.');
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    }
  };

  return (
    <Form
      form={form}
      onSubmit={handleSubmit}
      fields={[
        {
          type: 'input',
          name: 'password',
          label: 'New password',
          inputType: 'password',
          required: true,
          inputProps: { autoComplete: 'new-password' },
        },
        {
          type: 'input',
          name: 'confirm_password',
          label: 'Confirm new password',
          inputType: 'password',
          required: true,
          inputProps: { autoComplete: 'new-password' },
        },
      ]}
      submitText="Update password"
      hideResetButton
    />
  );
};
