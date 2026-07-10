import { logger } from '@/lib/utils/logger';

import { type AnalyticsEventMap, type AnalyticsEventName } from './events';

export type AnalyticsProvider = {
  track: <E extends AnalyticsEventName>(event: E, payload: AnalyticsEventMap[E]) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
};

let activeProvider: AnalyticsProvider | null = null;

/**
 * Plug a concrete analytics provider (PostHog, Segment, GA, etc.) in without
 * changing any call site. Call once from a client-side provider component.
 *
 * @example
 * registerAnalyticsProvider({
 *   track: (event, payload) => posthog.capture(event, payload),
 *   identify: (userId, traits) => posthog.identify(userId, traits),
 * });
 */
export const registerAnalyticsProvider = (provider: AnalyticsProvider): void => {
  activeProvider = provider;
};

/**
 * Type-safe event tracking. No-ops (with a dev-only debug log) until a
 * provider is registered via `registerAnalyticsProvider` — this keeps
 * `track()` call sites safe to ship before an analytics vendor is chosen.
 */
export const track = <E extends AnalyticsEventName>(
  event: E,
  payload: AnalyticsEventMap[E]
): void => {
  if (!activeProvider) {
    logger.debug(`[analytics] ${event}`, payload);
    return;
  }
  activeProvider.track(event, payload);
};

export const identify = (userId: string, traits?: Record<string, unknown>): void => {
  if (!activeProvider) {
    logger.debug(`[analytics] identify ${userId}`, traits);
    return;
  }
  activeProvider.identify(userId, traits);
};
