'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { useForm, useWatch, type Resolver } from 'react-hook-form';

import { useCreateRecurringTransaction } from '@/hooks/mutations';
import { useAccounts, useCategories } from '@/hooks/queries';
import { toISODateString } from '@/lib/utils/date';
import {
  createRecurringTransactionSchema,
  recurringFrequencyValues,
  type CreateRecurringTransactionInput,
} from '@/lib/validations/recurring-transaction';

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

type RecurringTransactionFormProps = {
  onSuccess?: () => void;
};

export const RecurringTransactionForm = ({ onSuccess }: RecurringTransactionFormProps) => {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { mutateAsync, isPending } = useCreateRecurringTransaction();

  const form = useForm<CreateRecurringTransactionInput>({
    resolver: zodResolver(
      createRecurringTransactionSchema
    ) as Resolver<CreateRecurringTransactionInput>,
    defaultValues: {
      type: 'expense',
      currency: 'INR',
      frequency: 'monthly',
      startDate: toISODateString(new Date()),
      autoPost: true,
    },
  });

  const txType = useWatch({ control: form.control, name: 'type' });
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const categoryOptions = (txType === 'income' ? incomeCategories : expenseCategories).map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const handleSubmit = async (data: CreateRecurringTransactionInput) => {
    try {
      await mutateAsync(data);
      toast.success('Recurring transaction created');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create recurring transaction'
      );
    }
  };

  return (
    <Card header={{ title: 'Set up recurring transaction' }}>
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'select',
            name: 'type',
            label: 'Type',
            required: true,
            options: [
              { label: 'Expense', value: 'expense' },
              { label: 'Income', value: 'income' },
            ],
          },
          {
            type: 'select',
            name: 'accountId',
            label: 'Account',
            required: true,
            options: accounts.map((a) => ({ label: a.name, value: a.id })),
          },
          {
            type: 'select',
            name: 'categoryId',
            label: 'Category',
            options: categoryOptions,
          },
          {
            type: 'number',
            name: 'amount',
            label: 'Amount',
            required: true,
            numberInputProps: { placeholder: '0.00', min: 0.01, step: 0.01 },
          },
          {
            type: 'select',
            name: 'frequency',
            label: 'Frequency',
            required: true,
            options: recurringFrequencyValues.map((v) => ({
              label: FREQ_LABELS[v] ?? v,
              value: v,
            })),
          },
          {
            type: 'date-picker',
            name: 'startDate',
            label: 'Start date',
            required: true,
          },
          {
            type: 'textarea',
            name: 'notes',
            label: 'Notes',
            placeholder: 'e.g. Netflix subscription',
          },
          {
            type: 'checkbox',
            name: 'autoPost',
            label: 'Auto-post transactions (manual post for now)',
          },
        ]}
        submitText={isPending ? 'Creating...' : 'Create recurring'}
        hideResetButton
      />
    </Card>
  );
};
