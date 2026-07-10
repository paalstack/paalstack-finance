'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Form, toast } from '@paalstack/react-ui';
import { type Resolver, useForm, useWatch } from 'react-hook-form';

import { useCreateTransaction, useUpdateTransaction } from '@/hooks/mutations';
import { useAccounts, useCategories } from '@/hooks/queries';
import { toISODateString } from '@/lib/utils/date';
import {
  type CreateTransactionInput,
  createTransactionSchema,
  transactionStatusValues,
  transactionTypeValues,
  type UpdateTransactionInput,
  updateTransactionSchema,
} from '@/lib/validations/transaction';

const TYPE_LABELS = { income: 'Income', expense: 'Expense', transfer: 'Transfer' };
const STATUS_LABELS = { pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled' };

type TransactionFormProps =
  | {
      mode: 'create';
      defaultType?: CreateTransactionInput['type'];
      onSuccess?: () => void;
    }
  | {
      mode: 'edit';
      defaultValues: UpdateTransactionInput;
      onSuccess?: () => void;
    };

export const TransactionForm = (props: TransactionFormProps) => {
  const { data: accounts = [] } = useAccounts();
  const { data: allCategories = [] } = useCategories();

  const isEdit = props.mode === 'edit';
  const { mutateAsync: createTx, isPending: creating } = useCreateTransaction();
  const { mutateAsync: updateTx, isPending: updating } = useUpdateTransaction();
  const isPending = creating || updating;

  const getSubmitLabel = () => {
    if (isPending) return 'Saving...';
    return isEdit ? 'Update' : 'Add transaction';
  };

  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(
      isEdit ? updateTransactionSchema : createTransactionSchema
    ) as Resolver<CreateTransactionInput>,
    defaultValues: isEdit
      ? props.defaultValues
      : {
          type: props.defaultType ?? 'expense',
          status: 'completed',
          currency: 'INR',
          date: toISODateString(new Date()),
          isRecurring: false,
          tags: [],
        },
  });

  const txType = useWatch({ control: form.control, name: 'type' });
  const incomeCategories = allCategories.filter((c) => c.type === 'income');
  const expenseCategories = allCategories.filter((c) => c.type === 'expense');
  const categoryOptions = txType === 'income' ? incomeCategories : expenseCategories;

  const accountOptions = accounts.map((a) => ({
    label: `${a.name} (${a.currency})`,
    value: a.id,
  }));

  const categorySelectOptions = categoryOptions.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const handleSubmit = async (data: CreateTransactionInput) => {
    try {
      if (isEdit && props.mode === 'edit') {
        await updateTx({ ...data, id: props.defaultValues.id });
        toast.success('Transaction updated');
      } else {
        await createTx(data);
        toast.success('Transaction added');
        form.reset();
      }
      props.onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save transaction');
    }
  };

  return (
    <Card>
      <Form
        form={form}
        onSubmit={handleSubmit}
        fields={[
          {
            type: 'select',
            name: 'type',
            label: 'Type',
            required: true,
            options: transactionTypeValues.map((v) => ({ label: TYPE_LABELS[v], value: v })),
          },
          {
            type: 'select',
            name: 'accountId',
            label: 'Account',
            required: true,
            options: accountOptions,
          },
          ...(txType === 'transfer'
            ? [
                {
                  type: 'select' as const,
                  name: 'toAccountId' as const,
                  label: 'To account',
                  required: true,
                  options: accountOptions,
                },
              ]
            : []),
          ...(txType !== 'transfer'
            ? [
                {
                  type: 'select' as const,
                  name: 'categoryId' as const,
                  label: 'Category',
                  options: categorySelectOptions,
                },
              ]
            : []),
          {
            type: 'number',
            name: 'amount',
            label: 'Amount',
            required: true,
            numberInputProps: { placeholder: '0.00', min: 0.01, step: 0.01 },
          },
          {
            type: 'date-picker',
            name: 'date',
            label: 'Date',
            required: true,
          },
          {
            type: 'input',
            name: 'description',
            label: 'Description',
            placeholder: 'What was this for?',
          },
          {
            type: 'select',
            name: 'status',
            label: 'Status',
            options: transactionStatusValues.map((v) => ({
              label: STATUS_LABELS[v],
              value: v,
            })),
          },
          {
            type: 'textarea',
            name: 'notes',
            label: 'Notes',
            placeholder: 'Optional notes',
          },
        ]}
        submitText={getSubmitLabel()}
        hideResetButton
      />
    </Card>
  );
};
