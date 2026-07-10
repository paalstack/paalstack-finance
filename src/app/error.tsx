'use client';

import { ErrorInternalServer } from '@paalstack/react-ui';
import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { logger } from '@/lib/utils/logger';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ErrorPage = ({ error, reset }: ErrorPageProps) => {
  const router = useRouter();

  useEffect(() => {
    logger.error('Unhandled application error', { message: error.message, digest: error.digest });
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorInternalServer
      error={error}
      statusCode={500}
      showErrorMessage={process.env.NODE_ENV === 'development'}
      onRefresh={reset}
      onGoBack={() => router.push('/dashboard')}
    />
  );
};

export default ErrorPage;
