import {
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';

import { type BudgetPeriod, type DateRange } from '@/types';

export const formatDate = (date: Date | string, pattern = 'dd MMM yyyy'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern);
};

export const formatDateTime = (date: Date | string): string =>
  formatDate(date, 'dd MMM yyyy, HH:mm');

export const formatMonthYear = (date: Date | string): string => formatDate(date, 'MMM yyyy');

export const getCurrentMonthRange = (): DateRange => ({
  from: startOfMonth(new Date()),
  to: endOfMonth(new Date()),
});

export const getLastMonthRange = (): DateRange => {
  const lastMonth = subMonths(new Date(), 1);
  return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
};

export const getCurrentWeekRange = (): DateRange => ({
  from: startOfWeek(new Date(), { weekStartsOn: 1 }),
  to: endOfWeek(new Date(), { weekStartsOn: 1 }),
});

export const getLastWeekRange = (): DateRange => {
  const lastWeek = subWeeks(new Date(), 1);
  return {
    from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
    to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
  };
};

export const getCurrentYearRange = (): DateRange => ({
  from: startOfYear(new Date()),
  to: endOfYear(new Date()),
});

export const getLastYearRange = (): DateRange => {
  const lastYear = subYears(new Date(), 1);
  return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
};

export const getCurrentQuarterRange = (): DateRange => ({
  from: startOfQuarter(new Date()),
  to: endOfQuarter(new Date()),
});

export const toISODateString = (date: Date): string => format(date, 'yyyy-MM-dd');

/** Resolves the "current window" for a budget's period, for progress aggregation. */
export const getBudgetPeriodRange = (
  period: BudgetPeriod,
  startDate: Date,
  endDate: Date | null
): DateRange => {
  switch (period) {
    case 'weekly':
      return getCurrentWeekRange();
    case 'monthly':
      return getCurrentMonthRange();
    case 'quarterly':
      return getCurrentQuarterRange();
    case 'yearly':
      return getCurrentYearRange();
    case 'custom':
      return { from: startDate, to: endDate ?? new Date() };
    default:
      return getCurrentMonthRange();
  }
};
