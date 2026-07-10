'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { useForm, type Resolver } from 'react-hook-form';

import { useCreateAccount } from '@/hooks/mutations';
import { useFamily } from '@/hooks/queries';
import {
  accountTypeValues,
  createAccountSchema,
  type CreateAccountInput,
} from '@/lib/validations/account';

const ACCOUNT_TYPE_OPTIONS = accountTypeValues.map((v) => ({
  label: v
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' '),
  value: v,
}));

type AccountFormProps = {
  onSuccess?: () => void;
};

export const AccountForm = ({ onSuccess }: AccountFormProps) => {
  const { mutateAsync, isPending } = useCreateAccount();
  const { data: family } = useFamily();

  const canShareWithFamily = family && family.myRole !== 'viewer';

  const form = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema) as Resolver<CreateAccountInput>,
    defaultValues: {
      currency: 'INR',
      balance: 0,
      color: '#6366f1',
      icon: 'wallet',
      isDefault: false,
    },
  });

  const handleSubmit = async (data: CreateAccountInput) => {
    try {
      await mutateAsync(data);
      toast.success('Account created');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
    }
  };

  return (
    <Card header={{ title: 'Add account', description: 'Track a bank, cash, or credit account' }}>
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'input',
            name: 'name',
            label: 'Account name',
            required: true,
            placeholder: 'e.g. HDFC Savings',
          },
          {
            type: 'select',
            name: 'type',
            label: 'Account type',
            required: true,
            options: ACCOUNT_TYPE_OPTIONS,
          },
          {
            type: 'number',
            name: 'balance',
            label: 'Opening balance',
            numberInputProps: { placeholder: '0.00', min: 0 },
          },
          {
            type: 'input',
            name: 'currency',
            label: 'Currency',
            placeholder: 'INR',
          },
          {
            type: 'checkbox',
            name: 'isDefault',
            label: 'Set as default account',
          },
          ...(canShareWithFamily
            ? [
                {
                  type: 'select' as const,
                  name: 'familyId' as const,
                  label: 'Share with family',
                  options: [
                    { label: 'Personal only', value: '' },
                    { label: family.name, value: family.id },
                  ],
                },
              ]
            : []),
        ]}
        submitText={isPending ? 'Creating...' : 'Create account'}
        hideResetButton
      />
    </Card>
  );
};
