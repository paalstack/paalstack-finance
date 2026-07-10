'use client';

import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Drawer,
  Grid,
  HStack,
  Progress,
  TypographyMuted,
  TypographySmall,
  toast,
} from '@paalstack/react-ui';
import { useState } from 'react';

import { EmptyState, LoadingState, PageHeader, StatCard } from '@/components/ui';
import { useUpdateLoan } from '@/hooks/mutations';
import { useLoans, useLoanPayments } from '@/hooks/queries';
import { formatCurrency, roundCurrency, sumAmounts } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';

import { LoanForm } from './loan-form';
import { LoanPaymentForm } from './loan-payment-form';

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal',
  home: 'Home',
  auto: 'Auto',
  education: 'Education',
  credit_card: 'Credit Card',
  others: 'Others',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-info/20 text-info',
  closed: 'bg-success/20 text-success',
  defaulted: 'bg-destructive/20 text-destructive',
  foreclosed: 'bg-warning/20 text-warning',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-success/20 text-success text-xs',
  missed: 'bg-destructive/20 text-destructive text-xs',
  pending: 'bg-warning/20 text-warning text-xs',
  late: 'bg-warning/20 text-warning text-xs',
};

type PaymentHistoryDrawerProps = {
  loanId: string;
  lenderName: string;
};

const PaymentHistoryDrawer = ({ loanId, lenderName }: PaymentHistoryDrawerProps) => {
  const [open, setOpen] = useState(false);
  const { data: payments = [], isLoading } = useLoanPayments(loanId);

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="outline" className="text-xs">
          History
        </Button>
      }
      title={`${lenderName} — Payment history`}
    >
      {isLoading && <LoadingState />}
      {!isLoading && payments.length === 0 && <EmptyState title="No payments recorded" />}
      {!isLoading && payments.length > 0 && (
        <Box className="divide-border divide-y">
          {payments.map((p) => (
            <Box key={p.id} className="flex items-center justify-between py-3">
              <Box>
                <TypographySmall className="font-medium">
                  {formatDate(String(p.payment_date))}
                </TypographySmall>
                <TypographyMuted className="text-xs">
                  Principal: {formatCurrency(parseFloat(String(p.principal_component)))} · Interest:{' '}
                  {formatCurrency(parseFloat(String(p.interest_component)))}
                </TypographyMuted>
              </Box>
              <Box className="text-right">
                <TypographySmall className="font-semibold tabular-nums">
                  {formatCurrency(parseFloat(String(p.amount)))}
                </TypographySmall>
                <Badge className={PAYMENT_STATUS_COLORS[p.status] ?? ''}>{p.status}</Badge>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Drawer>
  );
};

export const LoansView = () => {
  const [addOpen, setAddOpen] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);
  const { data: loans = [], isLoading } = useLoans();
  const { mutateAsync: updateLoan } = useUpdateLoan();

  const activeLoans = loans.filter((l) => l.status === 'active');
  const totalEmi = sumAmounts(activeLoans.map((l) => parseFloat(String(l.emi_amount))));
  const totalOutstanding = sumAmounts(
    activeLoans.map((l) => parseFloat(String(l.remaining_balance)))
  );
  const currency = loans[0]?.currency ?? 'INR';

  const handleClose = async (id: string) => {
    try {
      await updateLoan({ id, status: 'closed' });
      toast.success('Loan marked as closed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update loan');
    }
  };

  const paymentLoan = paymentLoanId ? loans.find((l) => l.id === paymentLoanId) : null;

  return (
    <Box className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Loans & EMI"
        description="Track your loans and monthly obligations"
        actions={
          <Dialog
            open={addOpen}
            onOpenChange={setAddOpen}
            trigger={<Button size="sm">Add loan</Button>}
            header={{ title: 'Add loan / EMI' }}
            contentClassName="max-w-lg"
          >
            <LoanForm onSuccess={() => setAddOpen(false)} />
          </Dialog>
        }
      />

      <Grid className="gap-4 p-6">
        <Grid className="grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Active loans" value={String(activeLoans.length)} />
          <StatCard label="Total monthly EMI" value={formatCurrency(totalEmi, { currency })} />
          <StatCard
            label="Total outstanding"
            value={formatCurrency(totalOutstanding, { currency })}
          />
        </Grid>

        {isLoading && <LoadingState />}
        {!isLoading && loans.length === 0 && (
          <EmptyState
            title="No loans tracked"
            description="Add a home loan, personal loan, vehicle loan, or credit card EMI."
            action={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                Add loan
              </Button>
            }
          />
        )}
        {!isLoading && loans.length > 0 && (
          <Grid className="grid-cols-1 gap-4 lg:grid-cols-2">
            {loans.map((loan) => {
              const principal = parseFloat(String(loan.principal));
              const remaining = parseFloat(String(loan.remaining_balance));
              const emi = parseFloat(String(loan.emi_amount));
              const repaid = roundCurrency(principal - remaining);
              const repaidPct = principal > 0 ? roundCurrency((repaid / principal) * 100) : 0;

              return (
                <Card key={loan.id} contentClassName="gap-3">
                  <Box className="flex items-start justify-between">
                    <Box>
                      <TypographySmall className="font-semibold">{loan.lender}</TypographySmall>
                      <HStack className="mt-1 gap-1.5">
                        <Badge className={STATUS_COLORS[loan.status] ?? ''}>{loan.status}</Badge>
                        <Badge variant="outline">{LOAN_TYPE_LABELS[loan.type] ?? loan.type}</Badge>
                      </HStack>
                    </Box>
                    <Box className="text-right">
                      <TypographySmall className="font-bold tabular-nums">
                        {formatCurrency(emi, { currency: loan.currency })}
                        <TypographyMuted className="ml-1 text-xs font-normal">/mo</TypographyMuted>
                      </TypographySmall>
                    </Box>
                  </Box>

                  <Box>
                    <Box className="mb-1 flex justify-between">
                      <TypographyMuted className="text-xs">
                        Repaid: {formatCurrency(repaid, { currency: loan.currency })}
                      </TypographyMuted>
                      <TypographyMuted className="text-xs">{repaidPct}%</TypographyMuted>
                    </Box>
                    <Progress value={repaidPct} />
                    <Box className="mt-1 flex justify-between">
                      <TypographyMuted className="text-xs">
                        Outstanding: {formatCurrency(remaining, { currency: loan.currency })}
                      </TypographyMuted>
                      <TypographyMuted className="text-xs">
                        Due: {formatDate(String(loan.due_date))}
                      </TypographyMuted>
                    </Box>
                  </Box>

                  <HStack className="flex-wrap gap-2">
                    {loan.status === 'active' && (
                      <Button size="sm" onClick={() => setPaymentLoanId(loan.id)}>
                        Record payment
                      </Button>
                    )}
                    <PaymentHistoryDrawer loanId={loan.id} lenderName={loan.lender} />
                    {loan.status === 'active' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground text-xs"
                        onClick={() => void handleClose(loan.id)}
                      >
                        Mark closed
                      </Button>
                    )}
                  </HStack>
                </Card>
              );
            })}
          </Grid>
        )}
      </Grid>

      <Dialog
        open={!!paymentLoanId}
        onOpenChange={(o) => {
          if (!o) setPaymentLoanId(null);
        }}
        header={{ title: 'Record EMI payment' }}
        contentClassName="max-w-lg"
      >
        {paymentLoan && (
          <LoanPaymentForm
            loanId={paymentLoan.id}
            defaultEmiAmount={parseFloat(String(paymentLoan.emi_amount))}
            hasLinkedAccount={!!paymentLoan.account_id}
            onSuccess={() => setPaymentLoanId(null)}
          />
        )}
      </Dialog>
    </Box>
  );
};
