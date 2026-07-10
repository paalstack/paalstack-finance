'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { Suspense, useEffect, type ReactNode } from 'react';

import { registerAnalyticsProvider } from './client';
import { PostHogPageView } from './posthog-pageview';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let initialized = false;

/**
 * Browser-side PostHog init, routed through the `/ingest` reverse proxy (see
 * `next.config.ts` rewrites) so ad blockers don't drop analytics requests.
 * No-ops entirely when `NEXT_PUBLIC_POSTHOG_KEY` is unset — same
 * fail-quiet pattern as `lib/ai`/`lib/email` when a provider isn't configured.
 *
 * Pageviews are captured manually (`capture_pageview: false`) because the App
 * Router doesn't fire the history events PostHog's autocapture listens for —
 * see `PostHogPageView`.
 */
export const PostHogProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    if (!posthogKey || initialized) return;
    initialized = true;

    posthog.init(posthogKey, {
      api_host: '/ingest',
      ui_host: posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
    });

    registerAnalyticsProvider({
      track: (event, payload) => posthog.capture(event, payload),
      identify: (userId, traits) => posthog.identify(userId, traits),
    });
  }, []);

  if (!posthogKey) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
};
