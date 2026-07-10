export type FormatCurrencyOptions = {
  currency?: string;
  locale?: string;
  compact?: boolean;
};

export const formatCurrency = (
  amount: number,
  { currency = 'INR', locale = 'en-IN', compact = false }: FormatCurrencyOptions = {}
): string => {
  const opts: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    ...(compact && { notation: 'compact', compactDisplay: 'short' }),
  };

  return new Intl.NumberFormat(locale, opts).format(amount);
};

export const parseCurrencyInput = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const roundCurrency = (amount: number, decimals = 2): number => {
  return Math.round(amount * 10 ** decimals) / 10 ** decimals;
};

export const sumAmounts = (amounts: number[]): number =>
  roundCurrency(amounts.reduce((acc, val) => acc + val, 0));

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];
