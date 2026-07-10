'use client';

import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Grid,
  TypographyLarge,
  TypographyMuted,
  TypographySmall,
  toast,
} from '@paalstack/react-ui';
import { useState } from 'react';

import { EmptyState, LoadingState, PageHeader, StatCard } from '@/components/ui';
import { useArchiveAccount } from '@/hooks/mutations';
import { useAccounts } from '@/hooks/queries';
import { formatCurrency, sumAmounts } from '@/lib/utils/currency';

import { AccountForm } from './account-form';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  cash: 'Cash',
  investment: 'Investment',
  loan: 'Loan',
  other: 'Other',
};

export const AccountsView = () => {
  const [open, setOpen] = useState(false);
  const { data: accounts = [], isLoading } = useAccounts();
  const { mutateAsync: archiveAccount } = useArchiveAccount();

  const totalBalance = sumAmounts(accounts.map((a) => parseFloat(String(a.balance))));
  const currency = accounts[0]?.currency ?? 'INR';

  const handleArchive = async (id: string) => {
    try {
      await archiveAccount(id);
      toast.success('Account archived');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive account');
    }
  };

  return (
    <Box className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Accounts"
        description="Manage your bank, cash, and credit accounts"
        actions={
          <Dialog
            open={open}
            onOpenChange={setOpen}
            trigger={<Button size="sm">Add account</Button>}
            header={{ title: 'Add account' }}
            contentClassName="max-w-md"
          >
            <AccountForm onSuccess={() => setOpen(false)} />
          </Dialog>
        }
      />

      <Grid className="gap-4 p-6">
        <StatCard
          label="Total Balance"
          value={formatCurrency(totalBalance, { currency })}
          hint={`Across ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
        />

        {isLoading && <LoadingState />}
        {!isLoading && accounts.length === 0 && (
          <EmptyState
            title="No accounts yet"
            description="Add your first account to start tracking your finances."
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                Add account
              </Button>
            }
          />
        )}
        {!isLoading && accounts.length > 0 && (
          <Grid className="grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card
                key={account.id}
                contentClassName="gap-3"
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleArchive(account.id)}
                    className="text-muted-foreground text-xs"
                  >
                    Archive
                  </Button>
                }
              >
                <Box className="flex items-center gap-3">
                  <Box
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{ backgroundColor: account.color ?? '#6366f1', color: '#fff' }}
                  >
                    {account.name[0]?.toUpperCase()}
                  </Box>
                  <Box>
                    <TypographySmall className="font-semibold">{account.name}</TypographySmall>
                    <Box className="mt-0.5 flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                      </Badge>
                      {account.familyId && (
                        <Badge variant="outline" className="text-xs">
                          Shared
                        </Badge>
                      )}
                    </Box>
                  </Box>
                </Box>
                <Box>
                  <TypographyLarge className="font-bold tabular-nums">
                    {formatCurrency(parseFloat(String(account.balance)), {
                      currency: account.currency,
                    })}
                  </TypographyLarge>
                  <TypographyMuted className="text-xs">{account.currency}</TypographyMuted>
                </Box>
              </Card>
            ))}
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
