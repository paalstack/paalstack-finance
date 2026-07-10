# PaalStack Finance

Personal (and family-shared) finance tracker — accounts, transactions,
budgets, loans/EMIs, and an AI assistant for spending insights. Built on
Next.js 16 (App Router), React 19, Supabase (Auth + Postgres + RLS), and
Drizzle ORM.

See [`docs/PRD.md`](docs/PRD.md) for product scope and
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) for the REST API contract.

## Tech stack

| Layer         | Choice                                                                       |
| ------------- | ---------------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, `src/proxy.ts` request proxy)                        |
| UI            | React 19, `@paalstack/react-ui`, Tailwind CSS v4                             |
| Data          | Supabase (Auth, Postgres, RLS), Drizzle ORM                                  |
| Client state  | TanStack Query, Zustand                                                      |
| Validation    | Zod, `@t3-oss/env-nextjs`                                                    |
| AI            | Vercel AI SDK (`ai`, `@ai-sdk/react`) against any OpenAI-compatible endpoint |
| Billing       | Stripe (Checkout, Customer Portal, webhooks)                                 |
| Email         | Resend                                                                       |
| Observability | Sentry (errors), PostHog (product analytics)                                 |
| Testing       | Vitest (unit), Playwright (e2e)                                              |

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in the required values below
pnpm db:migrate               # apply Drizzle migrations
pnpm dev
```

### Required environment variables

Everything is validated at startup by `src/lib/env.ts`. The app will refuse
to boot with a clear error if a **required** variable is missing:

- `DATABASE_URL` — Supabase Postgres connection string (transaction pooler,
  port `6543`, for the app; session pooler, port `5432`, for
  `drizzle-kit` migrations)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY` — from your
  [Supabase project's API settings](https://supabase.com/dashboard/project/_/settings/api)

Everything else (AI, Resend, Sentry, PostHog, Stripe) is **optional** — the
corresponding feature degrades gracefully (returns a clear `502
EXTERNAL_SERVICE_ERROR`/no-ops/logs a dev warning) instead of crashing the
app when unset. See [`.env.example`](.env.example) for the full list with
links to get each key.

## Scripts

```bash
pnpm dev              # dev server (Turbopack)
pnpm build             # production build
pnpm analyze           # production build with the bundle analyzer opened
pnpm start             # run the production build locally

pnpm lint              # ESLint
pnpm format            # Prettier (write)
pnpm type-check        # tsc --noEmit
pnpm test              # Vitest (unit)
pnpm test:coverage     # Vitest with coverage report
pnpm test:e2e          # Playwright

pnpm db:generate       # generate a new Drizzle migration from schema changes
pnpm db:migrate        # apply pending migrations
pnpm db:studio         # Drizzle Studio (visual DB browser)
```

## Architecture notes

- **Auth boundary:** `src/proxy.ts` (Next.js 16's request proxy — not a
  classic `middleware.ts`) protects routes under `PROTECTED_PREFIXES` and
  redirects unauthenticated requests to `/login`.
- **Authorization:** Row Level Security (RLS) is the source of truth for
  direct Supabase-client reads/writes. Route Handlers that use Drizzle with
  a privileged connection re-check ownership/family-role server-side via
  `requireAuth()` / `requireFamilyRole()` — see `docs/PRD.md` §4.1.
- **Money:** all amounts are `numeric(15,2)` in Postgres; use
  `src/lib/utils/currency.ts` (`roundCurrency`, `sumAmounts`) instead of raw
  floating-point arithmetic anywhere money is computed.
- **AI assistant** (`/assistant`): streaming chat backed by the Vercel AI
  SDK, with server-side tools (`src/lib/ai/tools.ts`) that run SQL
  aggregations over the caller's own data — the model never receives a
  user-controlled `userId`. Rate-limited per day by subscription plan
  (`src/lib/ai/rate-limit.ts`). Aggregation queries are cached 60s per user
  and invalidated immediately (`updateTag`) on any transaction/budget/loan
  write — see `src/lib/ai/cache.ts`.
- **Billing** (`/settings/billing`): Stripe Checkout + Customer Portal,
  redirect-based (no Stripe.js/Elements client-side, so no publishable key
  is needed). Webhook (`/api/webhooks/billing`) is the source of truth
  sync point — the app never calls Stripe synchronously on a read path.

## Deploying to Vercel

The repo includes a [`vercel.json`](vercel.json) (framework detection,
`pnpm install --frozen-lockfile`, `regions: ["bom1"]` — change this to
whichever region is closest to your Supabase project).

1. Import the repo in the [Vercel dashboard](https://vercel.com/new) (or
   `vercel link` + `vercel --prod` via the CLI).
2. Set every variable from `.env.example` that you want enabled in
   **Project Settings → Environment Variables**, for Production (and
   Preview, if you want feature branches to have AI/Stripe/etc. too).
   `NEXT_PUBLIC_APP_URL` should be your real production URL — it's used to
   build auth callback and Stripe redirect URLs.
3. Point `STRIPE_WEBHOOK_SECRET` at a webhook endpoint configured in the
   [Stripe Dashboard](https://dashboard.stripe.com/webhooks) targeting
   `https://<your-domain>/api/webhooks/billing`, subscribed to
   `customer.subscription.created|updated|deleted`.
4. If using Sentry, set `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` as
   **build-time** env vars (Vercel → Production & Preview) so source maps
   upload during `next build`.
5. Deploy. `pnpm build` runs `next build` (Sentry-wrapped, PostHog rewrites
   applied automatically via `next.config.ts`).

### Production readiness checklist

- [ ] `DATABASE_URL` points at the Supabase **transaction pooler** (port
      `6543`), not the session pooler, for the deployed app.
- [ ] `pnpm db:migrate` has been run against the production database (CI
      does not run migrations automatically — see `.github/workflows/ci.yml`).
- [ ] Supabase RLS policies are enabled on every table holding user data
      (already true for tables shipped in migrations `0001`–`0010`; verify
      before adding new tables).
- [ ] Sentry DSN set for both `SENTRY_DSN` (server) and
      `NEXT_PUBLIC_SENTRY_DSN` (client) if you want error monitoring;
      confirm a test error shows up in the Sentry project after first deploy.
- [ ] PostHog key set (`NEXT_PUBLIC_POSTHOG_KEY`) if you want analytics;
      confirm events appear (`login_completed`, `signup_completed`,
      `ai_message_sent`, `checkout_started`, `subscription_cancelled`).
- [ ] Stripe is in **live mode** keys (not test mode) with real
      `STRIPE_PRICE_*` price IDs, and the webhook endpoint is registered
      against the production URL with the live signing secret.
- [ ] `AI_API_KEY` set with a provider/model you're comfortable paying for
      (or a free-tier model) — verify the per-plan daily message caps in
      `src/lib/ai/rate-limit.ts` match your intended cost ceiling.
- [ ] `RESEND_API_KEY` + a verified sending domain if you want family
      invite emails to actually deliver (invites still work without it —
      an accept link is always returned — email is best-effort).
- [ ] Run `pnpm lint && pnpm type-check && pnpm test:coverage && pnpm build`
      locally (or trust CI — `.github/workflows/ci.yml` runs all four) before
      merging to `main`.
- [ ] `pnpm analyze` reviewed at least once to confirm no unexpectedly heavy
      client bundle regressions (`recharts` is intentionally lazy-loaded via
      `src/components/charts/index.tsx` — keep new heavy client deps behind
      `next/dynamic` too).

## Known issues

- **Windows + pnpm local builds:** `next build` (Turbopack) can fail to
  resolve `@paalstack/react-ui`'s bundled font files inside
  `src/styles/globals.css` with a `Module not found` error referencing an
  absolute Windows path into pnpm's virtual store
  (`node_modules/.pnpm/...`). This is a path-resolution quirk specific to
  Windows drive letters + pnpm's symlinked store + Tailwind v4's CSS
  bundling of `@font-face` URLs — it does not reproduce on Linux (CI,
  Vercel). If you hit it locally on Windows, `pnpm dev` is unaffected;
  work around production builds via WSL, Docker, or a Linux CI run.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to
`main` and every PR: lint → type-check → unit tests (with coverage
uploaded as an artifact) → build. It uses placeholder env vars +
`SKIP_ENV_VALIDATION=true` since CI never talks to a real database or
provider — this only bypasses env validation, not the actual application
logic being built/tested.
