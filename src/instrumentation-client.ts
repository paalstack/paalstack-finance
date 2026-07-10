import * as Sentry from '@sentry/nextjs';

/**
 * Browser-side Sentry init. No-ops entirely when `NEXT_PUBLIC_SENTRY_DSN` is
 * unset — consistent with how `lib/email`/`lib/ai` degrade gracefully when
 * their provider isn't configured, rather than throwing at build/boot time.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
