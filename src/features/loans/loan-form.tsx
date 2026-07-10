'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { useForm, type Resolver } from 'react-hook-form';

import { useCreateLoan } from '@/hooks/mutations';
import { useAccounts } from '@/hooks/queries';
import { toISODateString } from '@/lib/utils/date';
import { createLoanSchema, loanTypeValues, type CreateLoanInput } from '@/lib/validations/loan';

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal Loan',
  home: 'Home Loan',
  auto: 'Auto/Vehicle Loan',
  education: 'Education Loan',
  credit_card: 'Credit Card EMI',
  others: 'Others',
};

type LoanFormProps = {
  onSuccess?: () => void;
};

export const LoanForm = ({ onSuccess }: LoanFormProps) => {
  const { data: accounts = [] } = useAccounts();
  const { mutateAsync, isPending } = useCreateLoan();

  const today = toISODateString(new Date());

  const form = useForm<CreateLoanInput>({
    resolver: zodResolver(createLoanSchema) as Resolver<CreateLoanInput>,
    defaultValues: {
      type: 'personal',
      currency: 'INR',
      interestRate: 0,
      remainingBalance: 0,
      startDate: today,
      dueDate: today,
    },
  });

  const handleSubmit = async (data: CreateLoanInput) => {
    const payload = {
      ...data,
      remainingBalance: data.remainingBalance > 0 ? data.remainingBalance : data.principal,
    };
    try {
      await mutateAsync(payload);
      toast.success('Loan added');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add loan');
    }
  };

  return (
    <Card header={{ title: 'Add loan / EMI', description: 'Track a loan or credit card EMI' }}>
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'input',
            name: 'lender',
            label: 'Lender / Bank',
            required: true,
            placeholder: 'e.g. HDFC Bank',
          },
          {
            type: 'select',
            name: 'type',
            label: 'Loan type',
            required: true,
            options: loanTypeValues.map((v) => ({
              label: LOAN_TYPE_LABELS[v] ?? v,
              value: v,
            })),
          },
          {
            type: 'number',
            name: 'principal',
            label: 'Principal amount',
            required: true,
            numberInputProps: { placeholder: '500000', min: 1 },
          },
          {
            type: 'number',
            name: 'interestRate',
            label: 'Annual interest rate (%)',
            required: true,
            numberInputProps: { placeholder: '8.5', min: 0, step: 0.1 },
          },
          {
            type: 'number',
            name: 'emiAmount',
            label: 'Monthly EMI',
            required: true,
            numberInputProps: { placeholder: '15000', min: 1 },
          },
          {
            type: 'number',
            name: 'tenureMonths',
            label: 'Tenure (months)',
            required: true,
            numberInputProps: { placeholder: '60', min: 1 },
          },
          {
            type: 'date-picker',
            name: 'startDate',
            label: 'Loan start date',
            required: true,
          },
          {
            type: 'date-picker',
            name: 'dueDate',
            label: 'Final due / maturity date',
            required: true,
          },
          {
            type: 'select',
            name: 'accountId',
            label: 'Linked account (for EMI debits)',
            options: accounts.map((a) => ({ label: a.name, value: a.id })),
          },
          {
            type: 'input',
            name: 'currency',
            label: 'Currency',
            placeholder: 'INR',
          },
          {
            type: 'textarea',
            name: 'notes',
            label: 'Notes',
            placeholder: 'Optional',
          },
        ]}
        submitText={isPending ? 'Adding...' : 'Add loan'}
        hideResetButton
      />
    </Card>
  );
};
