/**
 * In-memory sliding-window rate limiter for sensitive, unauthenticated
 * actions (login, signup, password reset). Keyed by an arbitrary string —
 * callers should combine action name + client IP, e.g. `login:1.2.3.4`.
 *
 * Limitation: state lives in process memory, so it resets on redeploy and is
 * NOT shared across multiple serverless instances/regions. That's an
 * acceptable baseline defense against basic brute-force/credential-stuffing
 * scripts, but for real multi-instance production scale, swap this for a
 * shared store (e.g. Upstash Redis + `@upstash/ratelimit`) without changing
 * the call sites below.
 */

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

const cleanupStaleBuckets = (now: number, maxWindowMs: number) => {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > maxWindowMs) buckets.delete(key);
  }
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

/**
 * @param key Unique identifier for the caller + action being limited.
 * @param limit Max allowed attempts within `windowMs`.
 * @param windowMs Sliding window duration in milliseconds.
 */
export const checkRateLimit = (key: string, limit: number, windowMs: number): RateLimitResult => {
  const now = Date.now();
  cleanupStaleBuckets(now, windowMs);

  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: windowMs - (now - bucket.windowStart) };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterMs: 0 };
};

/** Common presets for auth-flow rate limiting, keyed by action name. */
export const AUTH_RATE_LIMITS = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  forgotPassword: { limit: 4, windowMs: 60 * 60 * 1000 },
  resetPassword: { limit: 6, windowMs: 15 * 60 * 1000 },
} as const;

export const formatRetryAfter = (retryAfterMs: number): string => {
  const seconds = Math.ceil(retryAfterMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.ceil(seconds / 60)}m`;
};
