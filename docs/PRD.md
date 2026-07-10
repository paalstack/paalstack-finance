# PaalStack Finance — Product Requirements Document

|                  |                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------- |
| **Status**       | Draft v1.0                                                                          |
| **Owner**        | PaalStack Finance team                                                              |
| **Last updated** | 2026-07-09                                                                          |
| **Source**       | Generated from repo audit of `paalstack-finance` (`src/`) at commit time of writing |

> This PRD is grounded in the actual codebase: existing DB schema, validation
> schemas, routes, and auth flows described here are real (with file
> references). Anything not yet implemented is explicitly marked **Planned**.

---

## 1. Overview

**PaalStack Finance** is a personal (and family-shared) finance tracker for
managing accounts, income/expenses, budgets, recurring transactions, loans,
and AI-assisted financial insights. It targets India-first UX defaults
(`INR`, `Asia/Kolkata`, `en_IN`) but is currency-agnostic per account/family.

Built on: Next.js 16 (App Router, `src/proxy.ts` request proxy — **not** a
standard `middleware.ts`), React 19, Supabase (Auth + Postgres + RLS),
Drizzle ORM, TanStack Query, Zod, Zustand.

### 1.1 Problem statement

Individuals and families lack a single, trustworthy place to:

- See all their money (across cash, bank, wallet, credit card, loans) in one view.
- Track where money goes without manual spreadsheets.
- Set and enforce budgets per category/period.
- Share visibility and control over shared household finances with the right
  permission boundaries (owner/admin/member/viewer).
- Track loan/EMI obligations alongside day-to-day spending.
- Get proactive, explainable insights ("you're 80% through your Dining budget")
  instead of static dashboards.

### 1.2 Goals

1. Give every user a single source of truth for balances across all accounts.
2. Make transaction entry fast (manual first; recurring/automated later).
3. Let users set budgets and get alerted before they overspend.
4. Let families share a financial view with per-member roles and safe RLS boundaries.
5. Track loans/EMIs as first-class objects linked to payments and accounts.
6. Lay a foundation for AI-generated insights on top of clean, structured data.
7. Ship a documented, versioned API contract so mobile/3rd-party clients can be
   built without depending on Supabase browser-client internals.

### 1.3 Non-goals (for now)

- Bank-account aggregation / Plaid-like auto-sync (no integration exists; all
  balances are manually entered/updated).
- Multi-currency conversion/FX (each account/family has a single currency;
  no FX rate engine).
- Investment portfolio tracking beyond a generic `investment`/`others`
  account type bucket.
- Tax filing or tax-advice features.
- Native mobile apps (web-first; API contract designed to make mobile
  feasible later).

### 1.4 Target users / personas

| Persona             | Description                                     | Key needs                                          |
| ------------------- | ----------------------------------------------- | -------------------------------------------------- |
| **Solo budgeter**   | Individual tracking personal spend/savings      | Fast entry, clear dashboard, budget alerts         |
| **Household admin** | Creates a Family, invites spouse/dependents     | Shared accounts/budgets, role control, invite flow |
| **Family member**   | Joins via invite code, contributes transactions | Simple UI, appropriate write/read scope by role    |
| **Borrower**        | Has active loans/EMIs                           | Loan schedule, payment tracking, due reminders     |
| **Power user**      | Wants trends, category breakdowns, AI insights  | Reports, AI chat, notifications                    |

---

## 2. Current State Assessment (as of this audit)

| Area                                                                         | Status                                                 | Evidence                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Auth (signup/login/forgot/reset/signout)                                     | ✅ Implemented via Server Actions                      | `src/lib/actions/auth-actions.ts`, `src/app/(auth)/**`                             |
| Session refresh & route protection                                           | ✅ Implemented                                         | `src/proxy.ts`, `src/lib/supabase/middleware.ts`                                   |
| Family create/join/manage                                                    | ✅ Implemented (Supabase-direct, RLS + RPC)            | `src/features/family/**`, `src/hooks/{queries,mutations}/use-family*`              |
| DB schema (13 tables, 15 enums, RLS, 10 migrations)                          | ✅ Implemented                                         | `src/lib/db/schema/**`, `src/lib/db/migrations/**`                                 |
| Zod validation schemas (accounts, transactions, categories, budgets, family) | ✅ Implemented, mostly **not wired to UI**             | `src/lib/validations/**`                                                           |
| API response envelope (`apiSuccess`/`apiError`/`apiPaginated`)               | ✅ Implemented, barely used                            | `src/lib/api/response.ts`                                                          |
| REST API routes                                                              | ⚠️ Only `/api/health` exists                           | `src/app/api/health/route.ts`                                                      |
| Accounts / Transactions / Categories / Budgets / Reports pages               | ⚠️ Placeholder shells (empty states, hardcoded zeros)  | `src/features/*/*-view.tsx`                                                        |
| Dashboard                                                                    | ⚠️ Placeholder                                         | `src/features/dashboard/dashboard-view.tsx`                                        |
| Loans / Loan payments                                                        | ⚠️ DB schema only, no UI/API                           | `src/lib/db/schema/loans.ts`, `loan-payments.ts`                                   |
| AI conversations/insights                                                    | ✅ Implemented (chat + tools, streaming, rate-limited) | `src/lib/ai/**`, `src/features/ai/**`, `src/app/api/ai/**`                      |
| Notifications                                                                | ⚠️ DB schema only                                      | `src/lib/db/schema/notifications.ts`                                               |
| Subscriptions/billing                                                        | ✅ Implemented (Stripe checkout/portal/webhooks)       | `src/lib/billing/**`, `src/features/billing/**`, `src/app/api/subscriptions/**` |
| Recurring transactions                                                       | ⚠️ DB schema + validation types only                   | `src/lib/db/schema/recurring-transactions.ts`                                      |

### 2.1 Known defects to resolve before/while building this roadmap

1. **Account type enum mismatch — ✅ Resolved.** DB (`account_type` pgEnum)
   previously used `cash | bank | wallet | credit_card | loan | others`,
   while the Zod schema (`src/lib/validations/account.ts`) and
   `src/types/finance.ts` used `checking | savings | credit_card | cash |
investment | loan | other`. The richer, app-facing Zod set was adopted as
   canonical; the DB enum was migrated to match
   (`src/lib/db/migrations/0010_accounts_align_account_type_enum.sql`).
   Legacy data is backfilled during migration: `bank` → `savings` (if the
   account name contains "saving") else `checking`; `wallet` → `other`;
   `others` → `other`. See `API_CONTRACT.md §3` for the finalized contract
   (no longer marked as a pending decision).
2. **Transaction date field naming** — DB column is `transaction_date`;
   existing hooks (`src/hooks/queries/use-transactions.ts`) reference `date`
   in Supabase queries. Must standardize on `transaction_date` at the DB/API
   boundary, with `date` as the wire-format camelCase field (already how Zod
   models it).
3. **Stale doc comment** — `src/features/loans/types.ts` claims "no dedicated
   DB table exists yet"; the `loans` and `loan_payments` tables already exist.
4. **`/reset-password` route protection gap** — not present in either
   `AUTH_ROUTES` or `PROTECTED_PREFIXES` in `src/proxy.ts`, so it's reachable
   whether or not the user is authenticated. Acceptable for the password-reset
   deep link flow but should be explicitly reviewed for abuse potential.

---

## 3. Functional Requirements

Each module below lists user-facing behavior. Data shapes are defined
authoritatively in **`API_CONTRACT.md`** — this PRD intentionally avoids
duplicating field-level schemas.

### 3.1 Authentication & Profile — ✅ mostly implemented

- Users sign up/log in with email + password via Supabase Auth.
- Email confirmation and password reset via `/auth/callback` exchange.
- A `profiles` row is upserted on first sign-in (`ensureProfile`), storing
  `currency` (default `INR`) and `timezone` (default `Asia/Kolkata`).
- Rate limiting on auth Server Actions (in-memory sliding window; **Planned**:
  move to a durable store — see NFR §5.3).
- **Planned:** OAuth providers (Google at minimum), profile settings page to
  edit name/avatar/currency/timezone (currently no UI for this despite the
  `profiles` schema supporting it).

### 3.2 Accounts — ⚠️ Planned (schema + validation exist, no API/UI wiring)

- Users create accounts of a type (bank, cash, wallet, credit card, loan,
  other — see Defect §2.1.1 for reconciliation), with name, currency, color,
  icon, opening balance.
- One account can be marked `is_default` (used as pre-selected account when
  logging a transaction).
- Accounts can be archived (soft-hidden from active views, retained for
  historical transaction integrity) but not hard-deleted while transactions
  reference them.
- Account balance is derived/maintained as transactions post against it
  (see §3.3 for balance-update semantics).
- List view groups by type, shows per-account balance and currency.

### 3.3 Transactions — ⚠️ Planned (schema + validation exist, no API/UI wiring)

- Three transaction types: `income`, `expense`, `transfer`.
  - `income`/`expense` require `accountId` + `categoryId` (category optional
    at the DB level, but the product requirement is to nudge/require
    categorization for reporting quality).
  - `transfer` requires both `accountId` (source) and `toAccountId`
    (destination, must differ from source) and moves money between the
    user's own accounts without affecting income/expense totals.
- Every transaction has a `status` (`pending | completed | cancelled`);
  only `completed` transactions affect account balances and budget
  consumption.
- Supports free-text `description`, `notes`, up to 10 `tags`.
- Supports filtering (by account, category, type, status, date range, amount
  range, free-text search, tags) with pagination (`page`, `pageSize` ≤ 100).
- **Balance semantics (must be enforced server-side, not just client-computed):**
  - `expense`: decrement `accounts.balance` by `amount`.
  - `income`: increment `accounts.balance` by `amount`.
  - `transfer`: decrement source, increment destination by `amount`.
  - Edits/deletes must reverse the prior effect before applying the new one
    (i.e., balance mutation is a transactional operation, not additive).
- **Planned:** bulk import (CSV), attachment/receipt upload.

### 3.4 Categories — ⚠️ Planned (schema + validation exist, no API/UI wiring)

- Two category types: `income`, `expense`.
- **System categories** (`is_system = true`, `user_id = null`) are seeded
  and shared across all users (see `src/lib/db/seed/categories.ts`); users
  cannot edit/delete system categories, only their own custom ones.
- Categories support a single level of nesting via `parentId` (schema has
  `parent_id`, currently no enforced FK or depth limit — product requirement
  is max depth of 1, i.e., no sub-sub-categories, to keep reporting simple).
- Users can reorder categories (`sortOrder`) and customize color/icon.

### 3.5 Budgets — ⚠️ Planned (schema + validation exist, no API/UI wiring)

- A budget is scoped to a category (optional — omitting `categoryId` implies
  an overall spending budget) and a period (`weekly | monthly | quarterly |
yearly | custom`).
- `custom` period requires an explicit `endDate`.
- `alertThreshold` (default 80%) drives a **Planned** notification
  (`budget_alert`) when cumulative spend in the period crosses the
  threshold.
- `rollover` (boolean): unspent amount carries into the next period when true.
- Budget progress = sum of `completed` `expense` transactions in the
  category (or all categories, if unscoped) within the current period
  window, compared against `amount`.
- Budgets can be family-scoped (`familyId` set) so all family members'
  spending counts toward one shared budget.

### 3.6 Recurring Transactions — ⚠️ Planned (schema exists only)

- Users define a template transaction (account, category, amount, type,
  frequency: `daily | weekly | biweekly | monthly | yearly`) with a
  `startDate`, optional `endDate`, and `nextRunDate`.
- `autoPost = true`: system automatically creates a real `transactions` row
  on `nextRunDate` (requires a scheduled job — **Planned**, no cron/worker
  exists yet in this repo).
- `autoPost = false`: system instead creates a `reminder` notification on
  `nextRunDate` for the user to confirm/post manually.
- Pausing (`isActive = false`) stops future runs without deleting history.

### 3.7 Family Sharing — ✅ implemented (Supabase-direct, not via REST API)

- A user creates a Family (name, description, currency) and becomes `owner`.
- Owner/admins invite others via a shareable, unique `inviteCode`
  (join flow: `joinFamilySchema` + `join_family_by_invite_code` RPC —
  migration `0009`).
- Roles: `owner > admin > member > viewer`, enforced via
  `hasFamilyRoleAtLeast`/`canManageFamily`/`canWriteFamilyData` helpers
  (`src/lib/auth/roles.ts`) plus Postgres RLS.
  - `viewer`: read-only.
  - `member`: can create/edit transactions, budgets scoped to the family.
  - `admin`: can also manage members (invite, change role, remove) and family
    settings.
  - `owner`: everything `admin` can, plus delete the family / transfer
    ownership (**Planned** — ownership transfer explicitly excluded from
    `assignableFamilyMemberRoles` today, flagged as a "separate, more
    sensitive flow").
- Removing a member sets `status = removed` (soft-remove; history retained).
- **Planned:** REST API surface for family operations (today it's
  Supabase-browser-client-direct only, which blocks non-web clients);
  formalize as route handlers using `requireFamilyRole()`.

### 3.8 Loans & EMIs — ⚠️ Planned (schema exists only)

- Track loans with lender, type (`personal | home | auto | education |
credit_card | others`), principal, interest rate, EMI amount, tenure,
  start/due dates, and running `remainingBalance`.
- Loan payments are individual EMI installments (`loan_payments`), each
  optionally linked to a `transactions` row (so paying an EMI can also debit
  an account) and split into `principalComponent` / `interestComponent` /
  `lateFee`.
- Loan status lifecycle: `active → closed | defaulted | foreclosed`.
- Payment status lifecycle: `pending → paid | late | missed`.
- **Planned:** amortization schedule generation/preview, EMI due
  reminders (`notification_type = emi_reminder`/`loan_due`).

### 3.9 Dashboard & Reports — ⚠️ Planned (UI placeholder, types exist)

- Dashboard summary: total balance (sum of non-archived account balances),
  total income/expenses/net savings for a selected period (default: current
  month), scoped to personal or a selected family.
- Reports: spending-by-category breakdown (`SpendingByCategory`), monthly
  income/expense/savings trend (`MonthlyTrend`), budget progress list
  (`BudgetProgress`).
- Date range and currency/family scoping driven by the Zustand
  `finance` store (`src/store/finance/store.ts`).

### 3.10 AI Insights — ✅ Implemented

- Conversational AI assistant (`/assistant`) over the user's financial data,
  built on the Vercel AI SDK against any OpenAI-compatible endpoint
  (`src/lib/ai/provider.ts`, gated by `isAiEnabled()` / `AI_PROVIDER`,
  `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` env vars — supports OpenRouter,
  NVIDIA NIM, and OpenAI; defaults to a free OpenRouter model). Streams
  responses via `streamText` / `toUIMessageStreamResponse`.
- Tool calling (`src/lib/ai/tools.ts`) gives the model SQL-aggregated,
  server-computed answers instead of guessing: `getSpendingSummary`,
  `getTopCategories`, `getBudgetStatus`, `getEmiWarnings`,
  `getSavingsSnapshot`. `userId` is always closed over server-side
  (`requireAuth()`) — never an LLM-controlled input — so the model can ask
  questions but can never choose whose data it reads.
- Conversations persisted per user as `ai_conversations.messages` (JSONB
  array of `{ role, content, createdAt }`); title auto-derived from the first
  user message. Conversation list/detail/archive via
  `src/app/api/ai/conversations/**` and a sidebar (`ConversationSidebar`).
- Aggregation queries backing the tools are cached per-user for 60s
  (`src/lib/ai/cache.ts`, `unstable_cache` + tag `finance:${userId}`) and
  invalidated immediately on write via `updateTag` from every
  transaction/budget/loan Server Action, so "how much did I spend" never
  returns stale data right after logging an expense.
- Rate-limited by subscription plan (`src/lib/ai/rate-limit.ts`,
  `checkAiChatRateLimit`) — see NFR §4.1 for the shared-store caveat that
  also applies here.
- **Must not** leak one family member's private (non-family) account data
  into a family-scoped AI context — current tools are user-scoped only, no
  family-wide AI context exists yet (**Planned**).
- **Not yet implemented:** proactive/push insight generation on the
  dashboard (the assistant is currently pull/chat-only, no background
  "you're 92% through your Dining budget" surfacing outside of asking).

### 3.11 Notifications — ⚠️ Planned (schema only)

- Types: `budget_alert, loan_due, emi_reminder, low_balance, family_invite,
subscription, ai_insight, system`.
- In-app notification center (unread badge, mark-as-read); `data` JSONB
  carries type-specific payload (e.g., `{ budgetId, percentUsed }`).
- **Planned:** email/push delivery channel (currently in-app/DB-only).

### 3.12 Subscriptions / Billing — ✅ Implemented (Stripe)

- Plans: `free | pro | family | enterprise`; billing cycle `monthly | yearly`.
  Stripe is the integrated provider (`provider`, `providerCustomerId`,
  `providerSubscriptionId` on `subscriptions`); `enterprise` is
  sales-assisted (mailto link), not self-serve Checkout.
- `src/lib/billing/**`: Checkout session creation, Customer Portal session
  creation, webhook handler that syncs subscription status/period/plan from
  Stripe events back onto the local row (source of truth stays local so app
  code never calls Stripe synchronously on the read path).
- Settings UI (`/settings/billing`, `src/features/billing/**`): current plan
  card, monthly/yearly toggle, upgrade/downgrade via Checkout, cancel
  (sets `cancelAtPeriodEnd`, does not immediately revoke), "Manage billing"
  → Stripe Customer Portal.
- Price IDs are configured per plan/cycle via `STRIPE_PRICE_*` env vars
  (`src/lib/billing/plans.ts`); a plan without a configured price throws a
  clear `ExternalServiceError` rather than silently no-oping.
- Trial support (`trialEndsAt`) exists in schema; not yet wired into
  Checkout (`subscription_data.trial_period_days`) — **Planned**.
- Feature-gating (family size limits, report history length) beyond the
  AI message caps below is **Planned** — not yet defined.

---

## 4. Non-Functional Requirements

### 4.1 Security & data isolation

- **Row Level Security (RLS)** is the primary authorization boundary for
  direct Supabase-client reads/writes (migrations `0001`, `0004`, `0007`,
  `0008`). Any new REST API route must not bypass RLS guarantees — either
  query through a Supabase client bound to the requesting user's session, or
  independently re-check ownership/family-membership server-side
  (`requireAuth()`, `requireFamilyRole()`) before touching Drizzle directly
  with a privileged connection.
- No cross-family or cross-user data leakage, including via the AI context
  window and notification payloads.
- Auth rate limiting must survive multi-instance deployment (current
  in-memory limiter in `src/lib/utils/rate-limit.ts` is single-instance only
  — **must move to a shared store, e.g., Redis/Supabase, before horizontal
  scaling**).

### 4.2 Data integrity

- Monetary values are `numeric(15,2)` in Postgres — API/UI must avoid
  floating-point arithmetic on money; use fixed-point/decimal-safe utilities
  (`src/lib/utils/currency.ts`: `roundCurrency`, `sumAmounts`).
- Transaction balance mutations (§3.3) must be atomic (DB transaction) to
  avoid partial updates on concurrent writes.
- Soft-delete pattern preferred over hard delete for anything referenced
  by history (accounts → `isArchived`, family members → `status: removed`).

### 4.3 Localization

- Default locale `en_IN`, default currency `INR`, default timezone
  `Asia/Kolkata`, but every account/family/budget/transaction carries its own
  `currency` field — the system must support non-INR users without a
  conversion engine (no cross-currency aggregation guarantees).

### 4.4 Performance

- List endpoints (transactions especially) must be paginated
  (`pageSize` capped at 100) and indexed — schema already defines composite
  indexes (`user_id, transaction_date`, `user_id, type`, etc.) that queries
  should be written to hit.
- Dashboard/report aggregations should be computed via SQL aggregation, not
  fetch-all-then-reduce-in-app.

### 4.5 Observability

- Structured logging via `src/lib/utils/logger.ts`; all new Route Handlers
  should log request failures with enough context to trace without logging
  PII (raw amounts are fine; avoid logging full transaction descriptions/notes
  at `info` level).
- **Error monitoring:** Sentry, wired per Next.js 16's `instrumentation.ts` /
  `instrumentation-client.ts` convention (`src/instrumentation*.ts`,
  `src/sentry.{server,edge}.config.ts`), plus `global-error.tsx`/`error.tsx`
  boundaries. No-op with zero overhead when `SENTRY_DSN`/
  `NEXT_PUBLIC_SENTRY_DSN` are unset. Source maps upload and ingest tunneling
  (`/monitoring`) only activate in CI when `SENTRY_ORG`/`SENTRY_PROJECT`/
  `SENTRY_AUTH_TOKEN` are set.
- **Product analytics:** `src/lib/analytics/events.ts` is the typed event
  catalog; PostHog is the registered provider (`src/lib/analytics/
posthog-{provider,server,pageview}.tsx`), proxied through `/ingest` (see
  `next.config.ts` rewrites) so ad blockers don't drop requests. Events
  tracked so far: `login_completed`, `signup_completed`, `ai_message_sent`,
  `checkout_started`. No-op when `NEXT_PUBLIC_POSTHOG_KEY` is unset.

### 4.6 Accessibility & UX

- Empty states, loading states, and error boundaries already have shared
  primitives (`src/components/ui/{empty-state,loading-state}.tsx`,
  `src/components/shared/app-error-boundary.tsx`) — all new views must use
  them rather than ad hoc placeholders.
- Follow existing PaalStack UI conventions (Props-API-first components,
  theme tokens only, no native HTML tags) per `.cursor/rules/paalstack.mdc`.

---

## 5. Success Metrics

| Metric                                     | Target (post-MVP)                        |
| ------------------------------------------ | ---------------------------------------- |
| Time to log a transaction                  | < 10s from dashboard                     |
| % of transactions categorized              | > 90%                                    |
| Budget alert delivery latency              | < 5 min after threshold breach           |
| Family invite → active member conversion   | > 70%                                    |
| Weekly active users returning to dashboard | Track as baseline (no target pre-launch) |
| API error rate (5xx) on core CRUD          | < 0.5%                                   |

---

## 6. Release Phasing

### Phase 0 — Foundation fixes (blocking)

- Resolve account-type enum mismatch (Defect §2.1.1).
- Standardize `transaction_date`/`date` naming across DB ↔ API ↔ hooks.
- Generate Supabase `Database` types to remove manual casts in hooks.

### Phase 1 — MVP core CRUD (this PRD's primary scope)

- Accounts: create/list/update/archive.
- Categories: list system + create/update/delete custom.
- Transactions: create/list (filtered+paginated)/update/delete, with atomic
  balance updates.
- Budgets: create/list/update, with computed progress.
- Dashboard: real summary numbers replacing placeholders.
- REST API Route Handlers for all of the above, per `API_CONTRACT.md`.

### Phase 2 — Family parity + Recurring + Reports

- Bring family-scoped variants of accounts/transactions/budgets to parity.
- Recurring transactions (manual "post now" first; automated cron later).
- Reports: category breakdown, monthly trend, exportable.
- Notifications: budget_alert, low_balance, family_invite (in-app only).

### Phase 3 — Loans, AI, Subscriptions

- Loans + loan payments CRUD, amortization preview, EMI reminders.
- ✅ AI conversations (chat + tools, rate-limited by plan) — see §3.10.
  **Planned:** proactive/push insights independent of the chat.
- ✅ Subscriptions/billing provider integration (Stripe) — see §3.12.
  **Planned:** feature-gating map beyond AI message caps.

---

## 7. Open Questions / Decisions Needed

1. ~~Canonical account type set~~ — **Resolved**, see Defect §2.1.1. The
   Zod/app-facing set (`checking, savings, credit_card, cash, investment,
loan, other`) is canonical end-to-end (DB enum, Zod, API contract).
2. Should categorization be **required** (not just optional at the schema
   level) for expense/income transactions to protect reporting quality?
3. Who can delete a Family, and what happens to historical transactions
   (retain read-only vs. cascade-delete)? Schema currently cascades
   `family_id` to `SET NULL` on most tables except `loans`
   (`ON DELETE CASCADE`) — confirm this asymmetry is intentional.
4. Ownership-transfer flow for families (explicitly deferred in
   `src/lib/validations/family.ts` comment) — design needed.
5. Recurring-transaction auto-posting requires a scheduled job runner — pick
   an approach (Vercel Cron, Supabase Edge Function + `pg_cron`, external
   worker)?
6. ~~AI cost controls~~ — **Resolved**: per-plan daily message caps enforced
   in `src/lib/ai/rate-limit.ts` (`checkAiChatRateLimit`), returning a 429
   `RateLimitedError`. Model selection is currently a single global
   `AI_MODEL` env var, not yet per-plan-tier — revisit if cost data after
   launch justifies tiering models too.
