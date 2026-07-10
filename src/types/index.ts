export * from './finance';
export * from './api';

export type AppError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export type ServerActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};
