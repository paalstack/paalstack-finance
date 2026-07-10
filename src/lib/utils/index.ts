export * from './currency';
export * from './date';
export * from './logger';
export * from './error';

export const cn = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(' ');

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const capitalise = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const nullToUndefined = <T>(value: T | null): T | undefined => value ?? undefined;

/**
 * PostgREST returns a single object for a to-one FK relationship, but supabase-js's
 * inferred type (without generated `Database` types) can't express that — it types
 * nested selects as arrays. Normalize both shapes to a single object (or null).
 */
export const toOneRelation = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;
