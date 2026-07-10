'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { useForm, type Resolver } from 'react-hook-form';

import { useCreateLoanPayment } from '@/hooks/mutations';
import { toISODateString } from '@/lib/utils/date';
import {
  createLoanPaymentSchema,
  loanPaymentStatusValues,
  type CreateLoanPaymentInput,
} from '@/lib/validations/loan';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  late: 'Late',
  missed: 'Missed',
};

type LoanPaymentFormProps = {
  loanId: string;
  defaultEmiAmount?: number;
  hasLinkedAccount?: boolean;
  onSuccess?: () => void;
};

export const LoanPaymentForm = ({
  loanId,
  defaultEmiAmount,
  hasLinkedAccount,
  onSuccess,
}: LoanPaymentFormProps) => {
  const { mutateAsync, isPending } = useCreateLoanPayment();

  const form = useForm<CreateLoanPaymentInput>({
    resolver: zodResolver(createLoanPaymentSchema) as Resolver<CreateLoanPaymentInput>,
    defaultValues: {
      amount: defaultEmiAmount ?? 0,
      principalComponent: 0,
      interestComponent: 0,
      lateFee: 0,
      status: 'paid',
      paymentDate: toISODateString(new Date()),
      postTransaction: !!hasLinkedAccount,
    },
  });

  const handleSubmit = async (data: CreateLoanPaymentInput) => {
    try {
      await mutateAsync({ loanId, input: data });
      toast.success('Payment recorded');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    }
  };

  return (
    <Card header={{ title: 'Record EMI payment' }}>
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'number',
            name: 'amount',
            label: 'Total amount paid',
            required: true,
            numberInputProps: { min: 0.01, step: 0.01 },
          },
          {
            type: 'number',
            name: 'principalComponent',
            label: 'Principal component',
            numberInputProps: { min: 0, step: 0.01 },
          },
          {
            type: 'number',
            name: 'interestComponent',
            label: 'Interest component',
            numberInputProps: { min: 0, step: 0.01 },
          },
          {
            type: 'number',
            name: 'lateFee',
            label: 'Late fee',
            numberInputProps: { min: 0, step: 0.01 },
          },
          {
            type: 'date-picker',
            name: 'paymentDate',
            label: 'Payment date',
            required: true,
          },
          {
            type: 'select',
            name: 'status',
            label: 'Status',
            options: loanPaymentStatusValues.map((v) => ({
              label: STATUS_LABELS[v] ?? v,
              value: v,
            })),
          },
          ...(hasLinkedAccount
            ? [
                {
                  type: 'checkbox' as const,
                  name: 'postTransaction' as const,
                  label: 'Also debit from linked account',
                },
              ]
            : []),
          {
            type: 'textarea',
            name: 'notes',
            label: 'Notes',
            placeholder: 'Optional',
          },
        ]}
        submitText={isPending ? 'Recording...' : 'Record payment'}
        hideResetButton
      />
    </Card>
  );
};
