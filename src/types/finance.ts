import { type FamilyActivityAction } from '@/lib/db/schema/family-activity-log';
import { type FamilyInviteStatus } from '@/lib/db/schema/family-invites';
import { type FamilyMemberRole, type FamilyMemberStatus } from '@/lib/db/schema/family-members';

export type { FamilyActivityAction, FamilyInviteStatus };

export type Currency = string;

export type DateRange = {
  from: Date;
  to: Date;
};

export type SortDirection = 'asc' | 'desc';

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

export type AccountType =
  'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'loan' | 'other';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export type CategoryType = 'income' | 'expense';

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export type DashboardSummary = {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  currency: Currency;
  period: DateRange;
};

export type AccountSummary = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: Currency;
  color: string;
  icon: string;
  familyId: string | null;
};

export type TransactionFilter = {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  dateRange?: DateRange;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  tags?: string[];
};

export type BudgetProgress = {
  budgetId: string;
  name: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  currency: Currency;
  period: BudgetPeriod;
  isOverBudget: boolean;
};

export type SpendingByCategory = {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
  transactionCount: number;
};

export type MonthlyTrend = {
  month: string;
  income: number;
  expenses: number;
  savings: number;
};

export type LoanType = 'personal' | 'home' | 'auto' | 'education' | 'credit_card' | 'others';
export type LoanStatus = 'active' | 'closed' | 'defaulted' | 'foreclosed';
export type LoanPaymentStatus = 'pending' | 'paid' | 'late' | 'missed';
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type LoanSummary = {
  id: string;
  userId: string;
  familyId: string | null;
  accountId: string | null;
  lender: string;
  type: LoanType;
  principal: number;
  interestRate: number;
  emiAmount: number;
  tenureMonths: number;
  startDate: string;
  dueDate: string;
  remainingBalance: number;
  currency: Currency;
  status: LoanStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoanPaymentSummary = {
  id: string;
  loanId: string;
  transactionId: string | null;
  amount: number;
  principalComponent: number;
  interestComponent: number;
  lateFee: number;
  paymentDate: string;
  status: LoanPaymentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmiDueSummary = {
  totalMonthlyEmi: number;
  activeLoansCount: number;
  currency: Currency;
  upcomingPayments: {
    loanId: string;
    lender: string;
    emiAmount: number;
    dueDate: string;
    currency: Currency;
  }[];
};

export type RecurringTransactionSummary = {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  toAccountId: string | null;
  type: TransactionType;
  amount: number;
  currency: Currency;
  notes: string | null;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  lastRunDate: string | null;
  isActive: boolean;
  autoPost: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FamilyMemberSummary = {
  id: string;
  userId: string;
  role: FamilyMemberRole;
  status: FamilyMemberStatus;
  fullName: string | null;
  email: string | null;
  joinedAt: string | null;
};

export type FamilySummary = {
  id: string;
  name: string;
  description: string | null;
  currency: Currency;
  inviteCode: string;
  ownerId: string;
  myRole: FamilyMemberRole;
  myMembershipId: string;
  members: FamilyMemberSummary[];
};

export type FamilyInviteSummary = {
  id: string;
  familyId: string;
  email: string;
  role: FamilyMemberRole;
  status: FamilyInviteStatus;
  invitedBy: string;
  inviterName: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type FamilyActivityLogEntry = {
  id: string;
  familyId: string;
  actorId: string | null;
  actorName: string | null;
  action: FamilyActivityAction;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};
