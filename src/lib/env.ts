import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
    SUPABASE_SECRET_KEY: z.string().min(1),
    SUPABASE_ACCESS_TOKEN: z.string().min(1).optional(),

    // AI insights — optional until a provider is wired up. lib/ai throws a
    // clear NotConfiguredError at call time when these are unset, rather
    // than silently returning fake data. `openrouter`/`nvidia` are
    // OpenAI-compatible providers with generous free-tier models.
    AI_PROVIDER: z.enum(['openai', 'openrouter', 'nvidia']).optional(),
    AI_API_KEY: z.string().min(1).optional(),
    AI_MODEL: z.string().min(1).default('meta-llama/llama-3.3-70b-instruct:free'),
    AI_BASE_URL: z.url().optional(),

    // Email delivery via Resend — optional. lib/email degrades gracefully when
    // unset: invite creation still succeeds and returns a shareable accept link.
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).default('PaalStack Finance <onboarding@paalstack.com>'),

    // Error monitoring via Sentry — optional. No-ops entirely when unset.
    SENTRY_DSN: z.url().optional(),
    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

    // Product analytics via PostHog — optional. lib/analytics no-ops (with a
    // dev-only debug log) until this is set.
    POSTHOG_KEY: z.string().min(1).optional(),
    POSTHOG_HOST: z.url().default('https://us.i.posthog.com'),

    // Stripe-backed billing — optional. lib/billing degrades gracefully when
    // unset: checkout/portal actions throw ExternalServiceError instead of
    // silently no-oping, consistent with lib/ai and lib/email.
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_PRO_MONTHLY: z.string().min(1).optional(),
    STRIPE_PRICE_PRO_YEARLY: z.string().min(1).optional(),
    STRIPE_PRICE_FAMILY_MONTHLY: z.string().min(1).optional(),
    STRIPE_PRICE_FAMILY_YEARLY: z.string().min(1).optional(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
    NEXT_PUBLIC_APP_NAME: z.string().min(1).default('PaalStack Finance'),
    NEXT_PUBLIC_DEBUG_MODE: z
      .string()
      .transform((val) => val === 'true')
      .default(false),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.url().default('https://us.i.posthog.com'),
  },

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
    AI_BASE_URL: process.env.AI_BASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    POSTHOG_KEY: process.env.POSTHOG_KEY,
    POSTHOG_HOST: process.env.POSTHOG_HOST,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    STRIPE_PRICE_PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
    STRIPE_PRICE_FAMILY_MONTHLY: process.env.STRIPE_PRICE_FAMILY_MONTHLY,
    STRIPE_PRICE_FAMILY_YEARLY: process.env.STRIPE_PRICE_FAMILY_YEARLY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },

  emptyStringAsUndefined: true,

  // Lets CI run `next build`/`tsc` for lint/type/bundle checks without real
  // secrets (Preview/Production deploys on Vercel always have the real env
  // set, so this never masks a genuine misconfiguration there).
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
