import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { toOneRelation } from '@/lib/utils';
import { type LoanPaymentStatus, type LoanStatus, type LoanType } from '@/types';

export const loansQueryKeys = {
  all: ['loans'] as const,
  list: () => [...loansQueryKeys.all, 'list'] as const,
  active: () => [...loansQueryKeys.all, 'active'] as const,
  payments: (loanId: string) => [...loansQueryKeys.all, 'payments', loanId] as const,
};

export type LoanAccountRef = {
  id: string;
  name: string;
  currency: string;
};

export type LoanRow = {
  id: string;
  family_id: string | null;
  account_id: string | null;
  lender: string;
  type: LoanType;
  principal: string;
  interest_rate: string;
  emi_amount: string;
  tenure_months: number;
  start_date: string;
  due_date: string;
  remaining_balance: string;
  currency: string;
  status: LoanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  accounts: LoanAccountRef | null;
};

export type LoanPaymentRow = {
  id: string;
  loan_id: string;
  transaction_id: string | null;
  amount: string;
  principal_component: string;
  interest_component: string;
  late_fee: string;
  payment_date: string;
  status: LoanPaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const fetchLoans = async (activeOnly = false): Promise<LoanRow[]> => {
  const supabase = createBrowserSupabaseClient();

  let query = supabase
    .from('loans')
    .select(
      'id, family_id, account_id, lender, type, principal, interest_rate, emi_amount, tenure_months, start_date, due_date, remaining_balance, currency, status, notes, created_at, updated_at, accounts(id, name, currency)'
    )
    .order('created_at', { ascending: false });

  if (activeOnly) query = query.eq('status', 'active');

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((loan) => ({
    ...loan,
    accounts: toOneRelation(loan.accounts),
  }));
};

const fetchLoanPayments = async (loanId: string): Promise<LoanPaymentRow[]> => {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('loan_payments')
    .select(
      'id, loan_id, transaction_id, amount, principal_component, interest_component, late_fee, payment_date, status, notes, created_at, updated_at'
    )
    .eq('loan_id', loanId)
    .order('payment_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
};

export const useLoans = (activeOnly = false) =>
  useQuery({
    queryKey: activeOnly ? loansQueryKeys.active() : loansQueryKeys.list(),
    queryFn: () => fetchLoans(activeOnly),
  });

export const useLoanPayments = (loanId: string) =>
  useQuery({
    queryKey: loansQueryKeys.payments(loanId),
    queryFn: () => fetchLoanPayments(loanId),
    enabled: !!loanId,
  });
