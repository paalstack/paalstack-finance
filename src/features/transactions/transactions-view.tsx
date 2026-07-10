'use client';

import {
  Box,
  Button,
  Dialog,
  Grid,
  HStack,
  Input,
  Select,
  Tabs,
  TypographyMuted,
  TypographySmall,
  toast,
} from '@paalstack/react-ui';
import { useState } from 'react';

import { EmptyState, LoadingState, PageHeader } from '@/components/ui';
import {
  useDeleteRecurringTransaction,
  useDeleteTransaction,
  usePostRecurringTransactionNow,
} from '@/hooks/mutations';
import {
  useAccounts,
  useCategories,
  useRecurringTransactions,
  useTransactions,
} from '@/hooks/queries';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { type TransactionFilter } from '@/types';

import { RecurringTransactionForm } from './recurring-transaction-form';
import { TransactionForm } from './transaction-form';

const TYPE_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Transfer', value: 'transfer' },
];

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const getAmountColorClass = (type: string) => {
  if (type === 'income') return 'text-success';
  if (type === 'transfer') return 'text-info';
  return 'text-destructive';
};

const getAmountPrefix = (type: string) => {
  if (type === 'income') return '+';
  if (type === 'transfer') return '⇄';
  return '-';
};

export const TransactionsView = () => {
  const [addOpen, setAddOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [addType, setAddType] = useState<'income' | 'expense'>('expense');
  const [filter, setFilter] = useState<TransactionFilter>({});
  const [search, setSearch] = useState('');

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [], isLoading } = useTransactions({
    ...filter,
    search: search || undefined,
  });
  const { data: recurringList = [], isLoading: recurringLoading } = useRecurringTransactions();
  const { mutateAsync: deleteTx } = useDeleteTransaction();
  const { mutateAsync: deleteRecurring } = useDeleteRecurringTransaction();
  const { mutateAsync: postNow, isPending: posting } = usePostRecurringTransactionNow();

  const handleAddIncome = () => {
    setAddType('income');
    setAddOpen(true);
  };
  const handleAddExpense = () => {
    setAddType('expense');
    setAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTx(id);
      toast.success('Transaction deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await deleteRecurring(id);
      toast.success('Recurring transaction removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove');
    }
  };

  const handlePostNow = async (id: string) => {
    try {
      await postNow(id);
      toast.success('Transaction posted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post');
    }
  };

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return (
    <Box className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Transactions"
        description="Track income, expenses, and transfers"
        actions={
          <HStack className="gap-2">
            <Button size="sm" variant="outline" onClick={handleAddIncome}>
              + Income
            </Button>
            <Button size="sm" onClick={handleAddExpense}>
              + Expense
            </Button>
          </HStack>
        }
      />

      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
        header={{ title: addType === 'income' ? 'Add income' : 'Add expense' }}
        contentClassName="max-w-lg"
      >
        <TransactionForm mode="create" defaultType={addType} onSuccess={() => setAddOpen(false)} />
      </Dialog>

      <Dialog
        open={recurringOpen}
        onOpenChange={setRecurringOpen}
        header={{ title: 'New recurring transaction' }}
        contentClassName="max-w-lg"
      >
        <RecurringTransactionForm onSuccess={() => setRecurringOpen(false)} />
      </Dialog>

      <Box className="p-6">
        <Tabs
          defaultValue="transactions"
          tabs={[
            {
              value: 'transactions',
              label: 'Transactions',
              content: (
                <Grid className="mt-4 gap-4">
                  <HStack className="flex-wrap gap-3">
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-48"
                    />
                    <Select
                      value={filter.type ?? ''}
                      onValueChange={(v) =>
                        setFilter((f) => ({
                          ...f,
                          type: v ? (v as TransactionFilter['type']) : undefined,
                        }))
                      }
                      options={TYPE_OPTIONS}
                      placeholder="All types"
                      className="w-36"
                    />
                    <Select
                      value={filter.accountId ?? ''}
                      onValueChange={(v) => setFilter((f) => ({ ...f, accountId: v ?? undefined }))}
                      options={[
                        { label: 'All accounts', value: '' },
                        ...accounts.map((a) => ({ label: a.name, value: a.id })),
                      ]}
                      placeholder="All accounts"
                      className="w-40"
                    />
                    {(filter.type ?? filter.accountId ?? search) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFilter({});
                          setSearch('');
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </HStack>

                  {isLoading && <LoadingState />}
                  {!isLoading && transactions.length === 0 && (
                    <EmptyState
                      title="No transactions yet"
                      description="Add your first income or expense to get started."
                      action={
                        <Button size="sm" onClick={handleAddExpense}>
                          Add transaction
                        </Button>
                      }
                    />
                  )}
                  {!isLoading && transactions.length > 0 && (
                    <Box className="border-border divide-border divide-y rounded-lg border">
                      {transactions.map((tx) => {
                        const cat = tx.category_id ? categoryMap[tx.category_id] : null;
                        const acc = accountMap[tx.account_id ?? ''];
                        const amount = parseFloat(String(tx.amount));
                        const amountColor = getAmountColorClass(tx.type);
                        const amountPrefix = getAmountPrefix(tx.type);

                        return (
                          <Box key={tx.id} className="flex items-center justify-between px-4 py-3">
                            <Box className="flex items-center gap-3">
                              <Box
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: cat?.color ?? '#64748b' }}
                              >
                                {(cat?.name ?? tx.type)[0]?.toUpperCase()}
                              </Box>
                              <Box>
                                <TypographySmall className="font-medium">
                                  {tx.description ?? cat?.name ?? tx.type}
                                </TypographySmall>
                                <TypographyMuted className="text-xs">
                                  {formatDate(String(tx.transaction_date))} · {acc?.name ?? ''}
                                </TypographyMuted>
                              </Box>
                            </Box>
                            <HStack className="gap-2">
                              <TypographySmall
                                className={`font-semibold tabular-nums ${amountColor}`}
                              >
                                {amountPrefix}
                                {formatCurrency(amount, { currency: tx.currency })}
                              </TypographySmall>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground text-xs"
                                onClick={() => void handleDelete(tx.id)}
                              >
                                ✕
                              </Button>
                            </HStack>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Grid>
              ),
            },
            {
              value: 'recurring',
              label: `Recurring (${recurringList.length})`,
              content: (
                <Grid className="mt-4 gap-4">
                  <HStack className="justify-end">
                    <Button size="sm" variant="outline" onClick={() => setRecurringOpen(true)}>
                      + Set up recurring
                    </Button>
                  </HStack>

                  {recurringLoading && <LoadingState />}
                  {!recurringLoading && recurringList.length === 0 && (
                    <EmptyState
                      title="No recurring transactions"
                      description="Set up EMIs, subscriptions, or salary as recurring entries."
                      action={
                        <Button size="sm" onClick={() => setRecurringOpen(true)}>
                          Set up recurring
                        </Button>
                      }
                    />
                  )}
                  {!recurringLoading && recurringList.length > 0 && (
                    <Box className="border-border divide-border divide-y rounded-lg border">
                      {recurringList.map((r) => {
                        const cat = r.category_id ? categoryMap[r.category_id] : null;
                        const acc = accountMap[r.account_id ?? ''];
                        const amount = parseFloat(String(r.amount));

                        return (
                          <Box key={r.id} className="flex items-center justify-between px-4 py-3">
                            <Box className="flex items-center gap-3">
                              <Box
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: cat?.color ?? '#64748b' }}
                              >
                                {(cat?.name ?? r.type)[0]?.toUpperCase()}
                              </Box>
                              <Box>
                                <TypographySmall className="font-medium">
                                  {cat?.name ?? r.type} — {acc?.name ?? ''}
                                </TypographySmall>
                                <TypographyMuted className="text-xs">
                                  {FREQ_LABELS[r.frequency] ?? r.frequency} · Next:{' '}
                                  {formatDate(String(r.next_run_date))}
                                </TypographyMuted>
                              </Box>
                            </Box>
                            <HStack className="gap-2">
                              <TypographySmall className="font-semibold tabular-nums">
                                {formatCurrency(amount, { currency: r.currency })}
                              </TypographySmall>
                              <Button
                                size="sm"
                                variant="outline"
                                isLoading={posting}
                                onClick={() => void handlePostNow(r.id)}
                              >
                                Post now
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive text-xs"
                                onClick={() => void handleDeleteRecurring(r.id)}
                              >
                                Remove
                              </Button>
                            </HStack>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Grid>
              ),
            },
          ]}
        />
      </Box>
    </Box>
  );
};
