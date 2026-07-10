export const APP_CONFIG = {
  name: 'PaalStack Finance',
  defaultCurrency: 'INR',
  defaultLocale: 'en-IN',
} as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 20,
  maxPageSize: 100,
} as const;

export const DATE_FORMATS = {
  short: 'dd MMM yyyy',
  long: 'dd MMM yyyy, HH:mm',
  monthYear: 'MMM yyyy',
  iso: 'yyyy-MM-dd',
} as const;

export const QUERY_STALE_TIME = {
  default: 30_000,
  static: 5 * 60_000,
} as const;

export const FILE_UPLOAD_LIMITS = {
  maxSizeBytes: 5 * 1024 * 1024,
  acceptedImageTypes: ['image/png', 'image/jpeg', 'image/webp'],
} as const;
