'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useRef } from 'react';

/**
 * Manually fires `$pageview` on every route change. Needs its own component
 * (rather than living in `PostHogProvider`) because `useSearchParams` opts
 * the subtree into client-side rendering and must be wrapped in `Suspense`.
 */
export const PostHogPageView = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const previousUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || !posthog) return;

    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (url === previousUrl.current) return;

    previousUrl.current = url;
    posthog.capture('$pageview', { $current_url: `${window.location.origin}${url}` });
  }, [pathname, searchParams, posthog]);

  return null;
};
