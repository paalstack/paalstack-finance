'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { useForm, useWatch, type Resolver } from 'react-hook-form';

import { useCreateBudget } from '@/hooks/mutations';
import { useCategories } from '@/hooks/queries';
import {
  budgetPeriodValues,
  createBudgetSchema,
  type CreateBudgetInput,
} from '@/lib/validations/budget';

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

type BudgetFormProps = {
  onSuccess?: () => void;
};

export const BudgetForm = ({ onSuccess }: BudgetFormProps) => {
  const { data: categories = [] } = useCategories('expense');
  const { mutateAsync, isPending } = useCreateBudget();

  const form = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema) as Resolver<CreateBudgetInput>,
    defaultValues: {
      currency: 'INR',
      period: 'monthly',
      rollover: false,
      alertThreshold: 80,
      startDate: new Date().toISOString(),
    },
  });

  const period = useWatch({ control: form.control, name: 'period' });

  const handleSubmit = async (data: CreateBudgetInput) => {
    try {
      await mutateAsync(data);
      toast.success('Budget created');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create budget');
    }
  };

  return (
    <Card
      header={{
        title: 'Create budget',
        description: 'Set a spending limit for a category or overall',
      }}
    >
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'input',
            name: 'name',
            label: 'Budget name',
            required: true,
            placeholder: 'e.g. Monthly Groceries',
          },
          {
            type: 'select',
            name: 'categoryId',
            label: 'Category (leave blank for overall budget)',
            options: categories.map((c) => ({ label: c.name, value: c.id })),
          },
          {
            type: 'number',
            name: 'amount',
            label: 'Budget amount',
            required: true,
            numberInputProps: { placeholder: '5000', min: 1, step: 0.01 },
          },
          {
            type: 'select',
            name: 'period',
            label: 'Period',
            required: true,
            options: budgetPeriodValues.map((v) => ({
              label: PERIOD_LABELS[v] ?? v,
              value: v,
            })),
          },
          {
            type: 'date-picker',
            name: 'startDate',
            label: 'Start date',
            required: true,
          },
          ...(period === 'custom'
            ? [
                {
                  type: 'date-picker' as const,
                  name: 'endDate' as const,
                  label: 'End date',
                  required: true,
                },
              ]
            : []),
          {
            type: 'number',
            name: 'alertThreshold',
            label: 'Alert threshold (%)',
            numberInputProps: { min: 0, max: 100, step: 5 },
          },
          {
            type: 'checkbox',
            name: 'rollover',
            label: 'Roll over unspent amount to next period',
          },
        ]}
        submitText={isPending ? 'Creating...' : 'Create budget'}
        hideResetButton
      />
    </Card>
  );
};
