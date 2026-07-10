import { PostHog } from 'posthog-node';

import { env } from '@/lib/env';

/**
 * Server-side PostHog client for events captured outside the browser
 * (Server Actions, Route Handlers, webhooks — e.g. `subscription_cancelled`
 * fired from the Stripe webhook). Distinct from the `posthog-js` browser
 * client wired in `posthog-provider.tsx`.
 *
 * A single instance is safe to reuse across invocations within the same
 * server process; `flushAt: 1` sends events immediately instead of batching,
 * since serverless functions can be frozen/torn down between requests.
 */
let serverClient: PostHog | null = null;

export const getPostHogServerClient = (): PostHog | null => {
  if (!env.POSTHOG_KEY) return null;
  serverClient ??= new PostHog(env.POSTHOG_KEY, {
    host: env.POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  return serverClient;
};

/** Fire-and-forget server-side capture. No-ops when PostHog isn't configured. */
export const captureServerEvent = (
  userId: string,
  event: string,
  properties?: Record<string, unknown>
): void => {
  getPostHogServerClient()?.capture({ distinctId: userId, event, properties });
};
