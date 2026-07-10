type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const isDev = process.env.NODE_ENV === 'development';

const formatMessage = (level: LogLevel, message: string, context?: LogContext): string => {
  const ts = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  return `[${ts}] [${level.toUpperCase()}] ${message}${ctx}`;
};

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (isDev) {
      console.warn(formatMessage('debug', message, context));
    }
  },

  info: (message: string, context?: LogContext) => {
    if (isDev) {
      console.warn(formatMessage('info', message, context));
    }
  },

  warn: (message: string, context?: LogContext) => {
    console.warn(formatMessage('warn', message, context));
  },

  error: (message: string, context?: LogContext) => {
    console.error(formatMessage('error', message, context));
  },
};
