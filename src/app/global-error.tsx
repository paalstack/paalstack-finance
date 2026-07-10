'use client';

import { ErrorInternalServer } from '@paalstack/react-ui';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { logger } from '@/lib/utils/logger';

import '@/styles/globals.css';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Catches errors thrown by the root layout itself — `error.tsx` cannot,
 * since it renders inside that layout. Must define its own <html>/<body>
 * because it replaces the entire root layout tree when triggered.
 */
const GlobalError = ({ error, reset }: GlobalErrorProps) => {
  useEffect(() => {
    logger.error('Unhandled root layout error', { message: error.message, digest: error.digest });
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorInternalServer
          error={error}
          statusCode={500}
          showErrorMessage={process.env.NODE_ENV === 'development'}
          onRefresh={reset}
        />
      </body>
    </html>
  );
};

export default GlobalError;
