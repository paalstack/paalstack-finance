# PaalStack Finance — API Contract

|               |                                                           |
| ------------- | --------------------------------------------------------- |
| **Status**    | Draft v1.0 — target contract for Phase 1–3 (see `PRD.md`) |
| **Base path** | `/api`                                                    |
| **Format**    | JSON only (`Content-Type: application/json`)              |
| **Auth**      | Supabase session cookie (browser) — see §1.3              |

> **Implementation status legend** used throughout this doc:
> ✅ **Live** — exists today exactly as described.
> 🆕 **Proposed** — target contract for a route that does not exist yet.
> Everything under `/api/*` below is 🆕 unless marked otherwise. Only
> `GET /api/health` and `GET /auth/callback` are ✅ live today outside the
> resource routes described below.

---

## 1. Conventions

### 1.1 Route layout

Resource routes live under `/api/...` as Next.js Route Handlers in
`src/app/api/**`. `GET /api/health` is the infra health check. `GET
/auth/callback` is the Supabase Auth code-exchange redirect endpoint (not a
JSON API).

### 1.2 Response envelope

All `/api/*` responses use the shared envelope from `src/types/api.ts` /
`src/lib/api/response.ts`.

**Success:**

```json
{ "success": true, "data": {/* resource or primitive */} }
```

**Success (paginated list):**

```json
{
  "success": true,
  "data": {
    "items": [/* T[] */],
    "total": 137,
    "page": 1,
    "pageSize": 20,
    "hasNextPage": true
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be positive",
    "details": {/* optional, e.g. Zod flatten() output */}
  }
}
```

Every route handler should be wrapped with `withApiErrorHandling` (already
implemented in `src/lib/api/response.ts`) so any thrown `FinanceError`
subclass is converted to this envelope automatically — handlers should
`throw` domain errors rather than manually constructing error responses.

### 1.3 Authentication

- All `/api/*` routes require a valid Supabase session, resolved server-side via
  `requireAuth()` (`src/lib/auth/session.ts`) reading the Supabase SSR
  cookie. There is no separate API-key/bearer-token auth in this contract;
  browser and any future mobile client authenticate the same way session
  cookies do today (Supabase SSR).
- Missing/invalid session → `401 UNAUTHORIZED`.
- Family-scoped write routes additionally call
  `requireFamilyRole(familyId, allowedRoles)` (`src/lib/auth/roles.ts`).
  Insufficient role → `403 FORBIDDEN`.
- **RLS remains the source-of-truth authorization boundary.** Route Handlers
  that use a privileged Drizzle connection (bypassing RLS) MUST replicate
  the same ownership/membership checks RLS would apply; never trust a
  client-supplied `userId`/`familyId` without cross-checking it against the
  authenticated session.

### 1.4 Error codes

| HTTP | `code`                   | Meaning                                                            |
| ---- | ------------------------ | ------------------------------------------------------------------ |
| 401  | `UNAUTHORIZED`           | No/invalid session                                                 |
| 403  | `FORBIDDEN`              | Authenticated but not permitted (e.g., wrong family role)          |
| 404  | `NOT_FOUND`              | Resource doesn't exist or isn't visible to this user               |
| 422  | `VALIDATION_ERROR`       | Request body/query failed Zod validation                           |
| 409  | `DUPLICATE_ENTRY`        | Unique constraint violation (e.g., invite code collision)          |
| 422  | `INSUFFICIENT_FUNDS`     | Domain rule violation (e.g., transfer would overdraw, if enforced) |
| 500  | `DATABASE_ERROR`         | Unexpected DB failure                                              |
| 502  | `EXTERNAL_SERVICE_ERROR` | Downstream failure (AI provider, billing provider)                 |
| 429  | `RATE_LIMITED`           | Rate limit exceeded (auth attempts, AI chat messages/day by plan)  |
| 500  | `UNKNOWN_ERROR`          | Uncaught error                                                     |

Source of truth: `ERROR_CODES` / `FinanceError` hierarchy in
`src/lib/utils/error.ts`.

### 1.5 Pagination

Query params: `page` (default `1`, min `1`), `pageSize` (default `20`, max
`100`). Response uses the paginated envelope (§1.2). Pattern source:
`transactionFilterSchema` in `src/lib/validations/transaction.ts` —
generalize the same `page`/`pageSize` params to every list endpoint.

### 1.6 Dates & money

- Dates are ISO-8601. Plain calendar dates (e.g., transaction date, loan due
  date) are `YYYY-MM-DD` strings (`z.string().date()`); timestamps are full
  `date-time` strings with offset (`z.string().datetime({ offset: true })`).
- Money fields are decimal strings or numbers accurate to 2dp
  (`numeric(15,2)` at the DB layer) — clients must not perform binary
  floating point math on returned amounts; treat as display/transport
  values and let the server own all arithmetic (see PRD §4.2).
- All request/response field names are `camelCase`; the DB layer is
  `snake_case` — mapping is the Route Handler's responsibility (already the
  convention `types/finance.ts` and `lib/validations/*` follow).

### 1.7 Family scoping

Resources that support family sharing accept an optional `familyId` in the
request body (write) or query string (list/read). Omitting it scopes the
operation to the caller's personal data. When present:

- Read: caller must have _any_ active membership in that family.
- Write: caller must have role ≥ `member` (`canWriteFamilyData`), except
  family membership management itself which requires role ≥ `admin`
  (`canManageFamily`).

---

## 2. Health

### `GET /api/health` — ✅ Live

No auth required.

**200 OK**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "paalstack-finance",
    "timestamp": "2026-07-09T05:40:00.000Z"
  }
}
```

---

## 3. Accounts

Backed by: `src/lib/db/schema/accounts.ts`, `src/lib/validations/account.ts`.

> **Contract decision — ✅ Resolved (see PRD §2.1.1, §7.1):** this contract
> adopts the **app-facing account type set** from
> `src/lib/validations/account.ts` — `checking | savings | credit_card |
cash | investment | loan | other` — as canonical. The DB `account_type`
> pgEnum has been migrated to match
> (`src/lib/db/migrations/0010_accounts_align_account_type_enum.sql`), with
> legacy values backfilled (`bank` → `savings`/`checking` by name heuristic,
> `wallet`/`others` → `other`). DB, Zod, and API now agree on this enum.

### 3.1 `Account` object

```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "HDFC Savings",
  "type": "savings",
  "balance": 152340.5,
  "currency": "INR",
  "color": "#6366f1",
  "icon": "wallet",
  "isDefault": true,
  "isArchived": false,
  "notes": null,
  "createdAt": "2026-01-05T10:00:00.000Z",
  "updatedAt": "2026-07-01T09:12:00.000Z"
}
```

### 3.2 `GET /api/accounts`

List the caller's accounts (or a family's, via `familyId`).

**Query params**

| Param               | Type        | Default    | Notes                     |
| ------------------- | ----------- | ---------- | ------------------------- |
| `familyId`          | uuid        | —          | optional; see §1.7        |
| `isArchived`        | boolean     | `false`    | filter archived vs active |
| `type`              | enum (§3.1) | —          | optional filter           |
| `page` / `pageSize` | int         | `1` / `20` | §1.5                      |

**200 OK** → paginated `Account[]`.

### 3.3 `POST /api/accounts`

Create an account. Auth required; role ≥ `member` if `familyId` present.

**Body** (`createAccountSchema`):

| Field       | Type                 | Required | Notes                                                |
| ----------- | -------------------- | -------- | ---------------------------------------------------- |
| `name`      | string, 1–100 chars  | ✅       |                                                      |
| `type`      | enum (§3.1)          | ✅       |                                                      |
| `balance`   | number               | —        | default `0`; opening balance                         |
| `currency`  | string, len 3        | —        | default `INR`                                        |
| `color`     | hex string `#rrggbb` | —        | default `#6366f1`                                    |
| `icon`      | string               | —        | default `wallet`                                     |
| `isDefault` | boolean              | —        | default `false`; setting `true` unsets prior default |
| `notes`     | string, ≤500 chars   | —        |                                                      |
| `familyId`  | uuid                 | —        | omit for personal account                            |

**201 Created** → `Account`.
**Errors:** `422 VALIDATION_ERROR`, `403 FORBIDDEN` (bad family role).

### 3.4 `GET /api/accounts/:id`

**200 OK** → `Account`. **404** if not found/not visible to caller.

### 3.5 `PATCH /api/accounts/:id`

**Body** (`updateAccountSchema` = partial `createAccountSchema` + `id`):
any subset of the fields in §3.3.

**200 OK** → updated `Account`.
**Errors:** `422`, `403`, `404`.

### 3.6 `DELETE /api/accounts/:id`

Soft-delete: sets `isArchived = true`. Hard delete is **not** supported via
this endpoint while any `transactions`/`recurring_transactions` reference
the account (PRD §4.2 integrity rule); attempting to archive is always
allowed, but a true hard-delete variant is out of scope for Phase 1.

**200 OK** → `{ "id": "uuid", "isArchived": true }`.
**Errors:** `404`, `403`.

---

## 4. Categories

Backed by: `src/lib/db/schema/categories.ts`, `src/lib/validations/category.ts`.

### 4.1 `Category` object

```json
{
  "id": "uuid",
  "userId": "uuid | null",
  "name": "Dining Out",
  "slug": "dining-out",
  "type": "expense",
  "color": "#f97316",
  "icon": "utensils",
  "isSystem": false,
  "parentId": null,
  "sortOrder": 3,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`userId: null` + `isSystem: true` denotes a shared, seeded category visible
to all users (read-only for everyone but a super-admin process).

### 4.2 `GET /api/categories`

**Query params:** `type` (`income`|`expense`, optional), `includeSystem`
(boolean, default `true`).

**200 OK** → non-paginated `Category[]` (categories are a bounded, small
list — no pagination needed), sorted by `sortOrder`.

### 4.3 `POST /api/categories`

**Body** (`createCategorySchema`): `name` (required, ≤100), `type`
(required), `color` (default `#6366f1`), `icon` (default `tag`), `parentId`
(optional uuid — max nesting depth 1 per PRD §3.4).

**201 Created** → `Category`. Always created with `isSystem: false`,
`userId` = caller.

### 4.4 `PATCH /api/categories/:id`

Partial update. **403** if target category `isSystem: true` or owned by
another user. **200 OK** → updated `Category`.

### 4.5 `DELETE /api/categories/:id`

**403** if `isSystem: true`. **409 DUPLICATE_ENTRY** is not applicable here;
if transactions reference this category, `categoryId` on those rows is set
to `null` per the DB's `ON DELETE SET NULL` — this is a genuine hard delete,
unlike accounts.

**200 OK** → `{ "id": "uuid", "deleted": true }`.

---

## 5. Transactions

Backed by: `src/lib/db/schema/transactions.ts`,
`src/lib/validations/transaction.ts`.

### 5.1 `Transaction` object

```json
{
  "id": "uuid",
  "userId": "uuid",
  "familyId": null,
  "accountId": "uuid",
  "categoryId": "uuid",
  "toAccountId": null,
  "type": "expense",
  "status": "completed",
  "amount": 450.0,
  "currency": "INR",
  "description": "Dinner with friends",
  "notes": null,
  "date": "2026-07-08",
  "isRecurring": false,
  "recurringId": null,
  "tags": ["dining", "friends"],
  "createdAt": "...",
  "updatedAt": "..."
}
```

> **Naming note:** the wire field is `date` (matches
> `createTransactionSchema`); it maps to the DB column `transaction_date`
> (see PRD Defect §2.1.2 — existing hooks incorrectly reference `date` as a
> Supabase column name today; the Route Handler layer is what should own
> this `date` ↔ `transaction_date` mapping going forward).

### 5.2 `GET /api/transactions`

**Query params** (`transactionFilterSchema` + §1.5 pagination):

| Param                     | Type                                | Notes                                  |
| ------------------------- | ----------------------------------- | -------------------------------------- |
| `accountId`               | uuid                                | optional                               |
| `categoryId`              | uuid                                | optional                               |
| `type`                    | `income`\|`expense`\|`transfer`     | optional                               |
| `status`                  | `pending`\|`completed`\|`cancelled` | optional                               |
| `from` / `to`             | date (`YYYY-MM-DD`)                 | inclusive range on `date`              |
| `minAmount` / `maxAmount` | number                              |                                        |
| `search`                  | string, ≤100                        | matches `description`/`notes`          |
| `tags`                    | string[]                            | any-match                              |
| `familyId`                | uuid                                | §1.7                                   |
| `page` / `pageSize`       | int                                 | default `1`/`20`, max `pageSize` `100` |

**200 OK** → paginated `Transaction[]`, sorted by `date desc, createdAt desc`.

### 5.3 `POST /api/transactions`

**Body** (`createTransactionSchema`):

| Field         | Type                            | Required      | Notes                                                                                                                                                              |
| ------------- | ------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `accountId`   | uuid                            | ✅            | source account                                                                                                                                                     |
| `categoryId`  | uuid                            | —             | required by product policy for `income`/`expense` (PRD Open Q #2)                                                                                                  |
| `toAccountId` | uuid                            | conditionally | required + must differ from `accountId` when `type = transfer`                                                                                                     |
| `type`        | `income`\|`expense`\|`transfer` | ✅            |                                                                                                                                                                    |
| `status`      | enum                            | —             | default `completed`                                                                                                                                                |
| `amount`      | number > 0, 2dp                 | ✅            |                                                                                                                                                                    |
| `currency`    | string, len 3                   | —             | default `INR`                                                                                                                                                      |
| `description` | string, ≤255                    | —             |                                                                                                                                                                    |
| `notes`       | string, ≤1000                   | —             |                                                                                                                                                                    |
| `date`        | date string                     | ✅            |                                                                                                                                                                    |
| `isRecurring` | boolean                         | —             | default `false`; `true` implies caller should instead use the Recurring Transactions API to manage the template, this flag is informational on the posted instance |
| `tags`        | string[], ≤10, each ≤50 chars   | —             | default `[]`                                                                                                                                                       |
| `familyId`    | uuid                            | —             | §1.7                                                                                                                                                               |

**Side effects:** on `status: completed`, atomically updates the balance of
`accountId` (and `toAccountId` for transfers) per PRD §3.3 balance
semantics, within the same DB transaction as the insert.

**201 Created** → `Transaction`.
**Errors:** `422 VALIDATION_ERROR` (including the transfer
same-account/missing-destination refinement), `404 NOT_FOUND` (account
doesn't belong to caller), `403 FORBIDDEN` (family role).

### 5.4 `GET /api/transactions/:id`

**200 OK** → `Transaction`. **404** otherwise.

### 5.5 `PATCH /api/transactions/:id`

**Body** (`updateTransactionSchema` = partial + `id`).

**Side effects:** must reverse the previous balance effect and apply the new
one atomically (PRD §3.3) — e.g., changing `amount` from 100 to 150 on a
completed expense increments the reversal by 100 then decrements by 150, net
-50, in one DB transaction.

**200 OK** → updated `Transaction`.

### 5.6 `DELETE /api/transactions/:id`

Hard delete. Reverses the balance effect (if `status` was `completed`)
before removing the row.

**200 OK** → `{ "id": "uuid", "deleted": true }`.

---

## 6. Budgets

Backed by: `src/lib/db/schema/budgets.ts`, `src/lib/validations/budget.ts`.

### 6.1 `Budget` object (as returned, includes computed progress)

```json
{
  "id": "uuid",
  "userId": "uuid",
  "familyId": null,
  "categoryId": "uuid | null",
  "name": "Monthly Dining Budget",
  "amount": 5000.0,
  "currency": "INR",
  "period": "monthly",
  "startDate": "2026-07-01T00:00:00.000Z",
  "endDate": null,
  "rollover": false,
  "alertThreshold": 80,
  "isActive": true,
  "notes": null,
  "createdAt": "...",
  "updatedAt": "...",
  "progress": {
    "spent": 4120.0,
    "remaining": 880.0,
    "percentUsed": 82.4,
    "isOverBudget": false
  }
}
```

`progress` is server-computed (see `BudgetProgress` in
`src/types/finance.ts`) from `completed` expense transactions in the
budget's category (or all categories if `categoryId` is null) within the
current period window; it is **not** stored, always freshly aggregated.

### 6.2 `GET /api/budgets`

**Query params:** `familyId` (optional), `isActive` (default `true`),
`page`/`pageSize`.

**200 OK** → paginated `Budget[]` (with `progress`).

### 6.3 `POST /api/budgets`

**Body** (`createBudgetSchema`):

| Field            | Type                                                 | Required      | Notes                           |
| ---------------- | ---------------------------------------------------- | ------------- | ------------------------------- |
| `categoryId`     | uuid                                                 | —             | omit for an overall budget      |
| `name`           | string, 1–100                                        | ✅            |                                 |
| `amount`         | number > 0                                           | ✅            |                                 |
| `currency`       | string, len 3                                        | —             | default `INR`                   |
| `period`         | `weekly`\|`monthly`\|`quarterly`\|`yearly`\|`custom` | —             | default `monthly`               |
| `startDate`      | datetime (offset)                                    | ✅            |                                 |
| `endDate`        | datetime (offset)                                    | conditionally | required when `period = custom` |
| `rollover`       | boolean                                              | —             | default `false`                 |
| `alertThreshold` | number 0–100                                         | —             | default `80`                    |
| `notes`          | string, ≤500                                         | —             |                                 |
| `familyId`       | uuid                                                 | —             | §1.7                            |

**201 Created** → `Budget`.

### 6.4 `PATCH /api/budgets/:id`

Partial update (`updateBudgetSchema`). **200 OK** → updated `Budget`.

### 6.5 `DELETE /api/budgets/:id`

Hard delete. **200 OK** → `{ "id": "uuid", "deleted": true }`.

---

## 7. Recurring Transactions

Backed by: `src/lib/db/schema/recurring-transactions.ts` (no validation
schema exists yet — proposed below, mirroring `createTransactionSchema`
conventions).

### 7.1 `RecurringTransaction` object

```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountId": "uuid",
  "categoryId": "uuid | null",
  "toAccountId": "uuid | null",
  "type": "expense",
  "amount": 999.0,
  "currency": "INR",
  "notes": "Netflix subscription",
  "frequency": "monthly",
  "startDate": "2026-01-01",
  "endDate": null,
  "nextRunDate": "2026-08-01",
  "lastRunDate": "2026-07-01",
  "isActive": true,
  "autoPost": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 7.2 `GET /api/recurring-transactions`

**Query params:** `isActive` (default `true`), `page`/`pageSize`.
**200 OK** → paginated list.

### 7.3 `POST /api/recurring-transactions`

**Body** (proposed `createRecurringTransactionSchema`): `accountId`
(required), `categoryId`/`toAccountId` (optional, same transfer rule as
§5.3), `type` (required), `amount` (required, >0), `currency` (default
`INR`), `notes` (optional), `frequency` (required: `daily|weekly|biweekly|
monthly|yearly`), `startDate` (required date), `endDate` (optional date),
`autoPost` (default `true`). `nextRunDate` is server-computed from
`startDate` + `frequency` on create, not client-supplied.

**201 Created** → `RecurringTransaction`.

### 7.4 `PATCH /api/recurring-transactions/:id`

Partial update. Changing `frequency`/`startDate` recomputes `nextRunDate`
server-side. **200 OK** → updated resource.

### 7.5 `POST /api/recurring-transactions/:id/post-now`

Manually trigger posting the next instance immediately as a real
`Transaction` (used both for `autoPost: false` templates and for
"catch-up" posting). Advances `nextRunDate`/`lastRunDate`.

**201 Created** → `{ "recurringTransaction": RecurringTransaction, "transaction": Transaction }`.

### 7.6 `DELETE /api/recurring-transactions/:id`

Stops future runs. **200 OK** → `{ "id": "uuid", "deleted": true }`.

> **Planned infra dependency:** automatic `autoPost` execution on
> `nextRunDate` requires a scheduled job (PRD Open Q #5) — until that exists,
> only `post-now` (manual) is functional.

---

## 8. Family

Backed by: `src/lib/db/schema/{families,family-members}.ts`,
`src/lib/validations/family.ts`. **Today implemented Supabase-direct
(browser client + RLS + RPC)** — routes below formalize the same operations
as REST for non-browser clients (PRD §3.7 "Planned").

### 8.1 `Family` object

```json
{
  "id": "uuid",
  "name": "The Sharmas",
  "description": "Household budget",
  "currency": "INR",
  "inviteCode": "SHARMA24",
  "ownerId": "uuid",
  "isActive": true,
  "myRole": "owner",
  "myMembershipId": "uuid",
  "members": [
    {
      "id": "uuid",
      "userId": "uuid",
      "role": "owner",
      "status": "active",
      "fullName": "Asha Sharma",
      "email": "asha@example.com",
      "joinedAt": "2026-01-05T10:00:00.000Z"
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 8.2 `GET /api/families`

List families the caller belongs to (`status: active`).
**200 OK** → non-paginated `Family[]` (bounded by realistic family counts per user).

### 8.3 `POST /api/families`

**Body** (`createFamilySchema`): `name` (2–100 chars), `description`
(optional, ≤500), `currency` (required, len 3).

Creates the family and an initial `family_members` row for the caller with
`role: owner`, `status: active`. Server-generates a unique `inviteCode`.

**201 Created** → `Family`.

### 8.4 `GET /api/families/:id`

**200 OK** → `Family` (with `members`). **403** if caller has no active
membership.

### 8.5 `POST /api/families/join`

**Body** (`joinFamilySchema`): `inviteCode` (4–32 chars, upper-cased
server-side). Implemented via the `join_family_by_invite_code` RPC
(migration `0009`).

**200 OK** → `Family` (the joined family).
**Errors:** `404 NOT_FOUND` (bad code), `409 DUPLICATE_ENTRY` (already a
member).

### 8.6 `PATCH /api/families/:id/members/:memberId`

Change a member's role. **Body** (`updateMemberRoleSchema`): `role` ∈
`admin | member | viewer` (note: `owner` is intentionally not assignable
here — ownership transfer is a separate, unimplemented flow, PRD Open Q #4).
Requires caller role ≥ `admin` (`canManageFamily`).

**200 OK** → updated member object.
**Errors:** `403 FORBIDDEN`, `404 NOT_FOUND`.

### 8.7 `DELETE /api/families/:id/members/:memberId`

Remove a member (soft: sets `status: removed`). Requires caller role ≥
`admin`; a member may also remove _themselves_ regardless of role
(leave-family case).

**200 OK** → `{ "memberId": "uuid", "status": "removed" }`.

### 8.8 `PATCH /api/families/:id`

Update family `name`/`description`/`currency`. Requires role ≥ `admin`.
**200 OK** → updated `Family`.

### 8.9 `DELETE /api/families/:id`

Requires caller role = `owner`. See PRD Open Q #3 for retention semantics
of historical family-scoped transactions/budgets before implementing.

---

## 9. Loans

Backed by: `src/lib/db/schema/{loans,loan-payments}.ts` (no validation
schema exists yet — proposed below).

### 9.1 `Loan` object

```json
{
  "id": "uuid",
  "userId": "uuid",
  "familyId": null,
  "accountId": "uuid | null",
  "lender": "HDFC Bank",
  "type": "home",
  "principal": 3500000.0,
  "interestRate": 8.5,
  "emiAmount": 32500.0,
  "tenureMonths": 180,
  "startDate": "2024-04-01",
  "dueDate": "2039-04-01",
  "remainingBalance": 3120000.0,
  "currency": "INR",
  "status": "active",
  "notes": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 9.2 `GET /api/loans`

**Query params:** `status` (optional), `familyId` (optional), `page`/`pageSize`.
**200 OK** → paginated `Loan[]`.

### 9.3 `POST /api/loans`

**Body** (proposed `createLoanSchema`): `lender` (required), `type`
(required, default `personal`), `principal` (required, >0), `interestRate`
(required, ≥0), `emiAmount` (required, >0), `tenureMonths` (required, int

> 0), `startDate`/`dueDate` (required dates), `remainingBalance` (required at
> creation — typically equal to `principal` for a new loan), `currency`
> (default `INR`), `accountId` (optional — account EMIs debit from),
> `familyId` (optional), `notes` (optional).

**201 Created** → `Loan`.

### 9.4 `PATCH /api/loans/:id`

Partial update, e.g. `status` transitions (`active → closed|defaulted|
foreclosed`). **200 OK** → updated `Loan`.

### 9.5 `GET /api/loans/:id/payments`

**`LoanPayment` object:**

```json
{
  "id": "uuid",
  "loanId": "uuid",
  "transactionId": "uuid | null",
  "amount": 32500.0,
  "principalComponent": 18200.0,
  "interestComponent": 14300.0,
  "lateFee": 0,
  "paymentDate": "2026-07-01",
  "status": "paid",
  "notes": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**200 OK** → paginated `LoanPayment[]`, sorted `paymentDate desc`.

### 9.6 `POST /api/loans/:id/payments`

**Body** (proposed `createLoanPaymentSchema`): `amount` (required, >0),
`principalComponent`/`interestComponent`/`lateFee` (default `0` each),
`paymentDate` (required date), `status` (default `pending`), `notes`
(optional), `postTransaction` (boolean, default `false` — when `true` and
`loan.accountId` is set, also creates a linked `expense` `Transaction`
debiting that account and sets `transactionId` on the payment).

Updates `loans.remainingBalance -= principalComponent` when `status: paid`.

**201 Created** → `LoanPayment`.

---

## 10. Dashboard & Reports

No dedicated DB table — computed read-only aggregations. Backed by types in
`src/types/finance.ts` (`DashboardSummary`, `SpendingByCategory`,
`MonthlyTrend`, `BudgetProgress`).

### 10.1 `GET /api/dashboard/summary`

**Query params:** `familyId` (optional), `from`/`to` (dates, default =
current month).

**200 OK**

```json
{
  "success": true,
  "data": {
    "totalBalance": 245300.0,
    "totalIncome": 85000.0,
    "totalExpenses": 42150.0,
    "netSavings": 42850.0,
    "currency": "INR",
    "period": { "from": "2026-07-01", "to": "2026-07-31" }
  }
}
```

### 10.2 `GET /api/reports/spending-by-category`

**Query params:** `familyId`, `from`/`to`, `type` (`income`|`expense`,
default `expense`).

**200 OK** → `SpendingByCategory[]`:

```json
[
  {
    "categoryId": "uuid",
    "categoryName": "Dining Out",
    "color": "#f97316",
    "icon": "utensils",
    "amount": 4120.0,
    "percentage": 32.4,
    "transactionCount": 14
  }
]
```

### 10.3 `GET /api/reports/monthly-trend`

**Query params:** `familyId`, `months` (int, default `6`, max `24`).

**200 OK** → `MonthlyTrend[]`:

```json
[{ "month": "2026-02", "income": 82000.0, "expenses": 51200.0, "savings": 30800.0 }]
```

### 10.4 `GET /api/reports/budget-progress`

**Query params:** `familyId`, `isActive` (default `true`).

**200 OK** → `BudgetProgress[]` (same shape as `Budget.progress` in §6.1,
flattened with `budgetId`/`name`/`limit`/`period` included).

---

## 11. AI Conversations — ✅ Implemented (streaming chat, not the request/reply shape originally proposed below)

Backed by: `src/lib/db/schema/ai-conversations.ts`, `src/lib/ai/**`,
`src/features/ai/**`. Superseded the originally-proposed non-streaming
`POST .../messages` endpoint (§11.4 as drafted) in favor of a single
streaming chat endpoint compatible with the AI SDK's `useChat`/
`DefaultChatTransport` on the client — see §11.4 below for what actually
shipped.

### 11.1 `GET /api/ai/conversations`

**Query params:** `familyId` (optional), `isArchived` (default `false`).

**200 OK** → array of `{ id, title, model, isArchived, lastMessageAt,
createdAt }` (message bodies omitted from the list view). Not currently
paginated (conversation counts per user are small; revisit if that changes).

### 11.2 `POST /api/ai/conversations`

**Body:** `{ "title"?: string, "familyId"?: "uuid", "model"?: string }`.
**200 OK** → `{ id, title: string | null, messages: [] }`.
**Errors:** `502 EXTERNAL_SERVICE_ERROR` is not expected here (no AI call
yet).

Note: the client does not have to call this before chatting — it generates
a UUID client-side and routes to `/assistant/:id` immediately; the
conversation row is created lazily by §11.4 on the first message
(`ensureConversation`).

### 11.3 `GET /api/ai/conversations/:id`

**200 OK** → `{ id, title, model, isArchived, lastMessageAt, createdAt,
messages: UIMessage[] }`, where each stored `{ role, content, createdAt }`
row is converted to an AI SDK `UIMessage` (`{ id, role, parts: [{ type:
"text", text }], metadata: { createdAt } }`) via `toUIMessage` — this is
the shape the client's `useChat` hook expects for `initialMessages`.

### 11.4 `PATCH /api/ai/conversations/:id`

**Body:** `{ "isArchived": boolean }`.
**200 OK** → `{ id, isArchived }`.

Also exposed as the `archiveConversationAction` Server Action for the
sidebar's archive button.

### 11.5 `POST /api/ai/chat` — the actual chat turn

**Body:** `{ "id": conversationId, "messages": UIMessage[], "conversationId": "uuid", "familyId"?: "uuid" }`
(shape sent by `@ai-sdk/react`'s `useChat` + `DefaultChatTransport`; full
client-side message history is resent each turn, matching AI SDK
conventions — the server does not re-fetch history from the DB mid-turn).

Runs `streamText` with the finance tool set (`createFinanceTools`:
`getSpendingSummary`, `getTopCategories`, `getBudgetStatus`,
`getEmiWarnings`, `getSavingsSnapshot` — see PRD §3.10) against
`getAiModel()`, and streams back an AI SDK UI message stream
(`toUIMessageStreamResponse`, `Content-Type:
text/event-stream`-equivalent AI SDK protocol, not a JSON envelope). On
stream completion, persists the full message list (user + assistant +
any tool-call parts collapsed to text) to `ai_conversations` and updates
`lastMessageAt`.

**Response header:** `X-Conversation-Id` (useful when the client didn't
already know the id).

**Errors** (returned as a JSON `apiError` envelope _before_ streaming
starts, i.e. only for pre-stream failures):

- `401 UNAUTHORIZED`
- `502 EXTERNAL_SERVICE_ERROR` — `isAiEnabled()` is `false` (no
  `AI_API_KEY` configured)
- `429 RATE_LIMITED` — `checkAiChatRateLimit` daily cap exceeded for the
  caller's plan (see PRD §3.10, §7.6)
- `422 VALIDATION_ERROR` — malformed body

Mid-stream provider errors (timeout, model failure) are logged
server-side and surfaced to the client as an AI SDK stream error part,
not a top-level HTTP error — the `ChatPanel` UI shows a retry affordance.

### 11.6 `GET /api/ai/insights` — 🆕 Proposed, not implemented

Proactive, pre-computed insights (not a chat) for the dashboard, independent
of the conversational assistant. Still only a proposal — see PRD §3.10 "Not
yet implemented".

**Query params:** `familyId` (optional).

**200 OK** → `AiInsight[]` per `src/features/ai/types.ts`:

```json
[
  {
    "id": "uuid",
    "category": "budget",
    "message": "You've spent 92% of your Dining budget with 10 days left.",
    "severity": "warning"
  }
]
```

---

## 12. Notifications

Backed by: `src/lib/db/schema/notifications.ts`.

### 12.1 `Notification` object

```json
{
  "id": "uuid",
  "userId": "uuid",
  "familyId": null,
  "type": "budget_alert",
  "title": "Budget alert",
  "message": "You've used 82% of your Dining Out budget.",
  "data": { "budgetId": "uuid", "percentUsed": 82.4 },
  "isRead": false,
  "readAt": null,
  "createdAt": "..."
}
```

### 12.2 `GET /api/notifications`

**Query params:** `isRead` (optional), `page`/`pageSize` (default
`pageSize` `20`, sorted `createdAt desc`).

**200 OK** → paginated `Notification[]`, plus a sibling
unread-count endpoint below.

### 12.3 `GET /api/notifications/unread-count`

**200 OK** → `{ "count": 4 }`.

### 12.4 `PATCH /api/notifications/:id/read`

**200 OK** → `{ "id": "uuid", "isRead": true, "readAt": "..." }`.

### 12.5 `POST /api/notifications/read-all`

Marks all of the caller's unread notifications as read.
**200 OK** → `{ "updated": 4 }`.

---

## 13. Subscriptions / Billing — ✅ Implemented (Stripe)

Backed by: `src/lib/db/schema/subscriptions.ts`, `src/lib/billing/**`.
Stripe is the integrated provider.

### 13.1 `Subscription` object

```json
{
  "id": "uuid",
  "userId": "uuid",
  "familyId": null,
  "plan": "pro",
  "status": "active",
  "billingCycle": "monthly",
  "priceAmount": 299.0,
  "currency": "INR",
  "currentPeriodStart": "2026-07-01T00:00:00.000Z",
  "currentPeriodEnd": "2026-08-01T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "trialEndsAt": null,
  "canceledAt": null
}
```

(`provider`, `providerCustomerId`, `providerSubscriptionId` are internal
fields, intentionally omitted from the API response — server-only.)

### 13.2 `GET /api/subscriptions/me`

Returns the caller's current subscription. `getOrCreateSubscription` lazily
inserts an implicit `free` row on first access if none exists — no separate
signup trigger needed.

**200 OK** → `Subscription`.

### 13.3 `POST /api/subscriptions/checkout`

**Body:** `{ "plan": "pro"|"family"|"enterprise", "billingCycle": "monthly"|"yearly" }`
(`checkoutRequestSchema`). Note: `enterprise` has no self-serve Stripe
price configured — the client routes `enterprise` to a `mailto:` sales
link instead of calling this endpoint.

**200 OK** → `{ "checkoutUrl": "https://checkout.stripe.com/..." }`.
**Errors:** `502 EXTERNAL_SERVICE_ERROR` if billing is not configured
(`isBillingEnabled()` false, i.e. `STRIPE_SECRET_KEY` unset) or if no
`STRIPE_PRICE_*` env var is set for the requested plan/cycle.

### 13.4 `POST /api/subscriptions/portal` — 🆕 shipped, not in original draft

No body. Creates a Stripe Customer Portal session (invoices, payment
method, self-serve plan changes/cancellation via Stripe's hosted UI).

**200 OK** → `{ "portalUrl": "https://billing.stripe.com/..." }`.
**Errors:** `502 EXTERNAL_SERVICE_ERROR` if billing is not configured.

### 13.5 `POST /api/subscriptions/cancel`

Sets `cancelAtPeriodEnd: true` on both Stripe (via
`stripe.subscriptions.update`) and the local row — Stripe is updated
first, then mirrored locally, so a Stripe failure never leaves the local
row out of sync. Does not immediately revoke access.

**200 OK** → `{ id, plan, status, cancelAtPeriodEnd, currentPeriodEnd }`.
**Errors:** `422 VALIDATION_ERROR` if the caller has no active paid
subscription to cancel; `502 EXTERNAL_SERVICE_ERROR` if billing is not
configured.

### 13.6 `POST /api/webhooks/billing` — Stripe webhook (server-to-server)

Not user-authenticated; verified via the `stripe-signature` header against
`STRIPE_WEBHOOK_SECRET` instead of a Supabase session
(`src/lib/billing/webhook-handlers.ts`). Handles
`customer.subscription.{created,updated,deleted}` to keep the local
`subscriptions` row's `plan`/`status`/`currentPeriodEnd`/
`providerSubscriptionId` in sync with Stripe — subscription lifecycle
events carry the full subscription object and are more reliable than
trusting `checkout.session.completed` alone, so that event and
`invoice.payment_failed` are intentionally not handled yet
(**Planned** if dunning/payment-failure UX is needed later). The local row
remains the source of truth for the rest of the app so no other route calls
Stripe synchronously on the read path. A Stripe subscription is tied back
to a local user via `subscription_data.metadata.userId`, set at Checkout
time (`src/lib/billing/checkout.ts`).

**200 OK** → `{ "received": true }`. **400** on signature verification
failure.

---

## 14. Summary Table

| Resource                | Base path                                  | Auth                   | Family-scopable      | Status                                                  |
| ----------------------- | ------------------------------------------ | ---------------------- | -------------------- | ------------------------------------------------------- |
| Health                  | `/api/health`                              | none                   | —                    | ✅ Live                                                 |
| Auth callback           | `/auth/callback`                           | Supabase code exchange | —                    | ✅ Live                                                 |
| Accounts                | `/api/accounts`                         | session                | ✅                   | 🆕 Proposed                                             |
| Categories              | `/api/categories`                       | session                | — (user or system)   | 🆕 Proposed                                             |
| Transactions            | `/api/transactions`                     | session                | ✅                   | 🆕 Proposed                                             |
| Budgets                 | `/api/budgets`                          | session                | ✅                   | 🆕 Proposed                                             |
| Recurring Transactions  | `/api/recurring-transactions`           | session                | —                    | 🆕 Proposed                                             |
| Families                | `/api/families`                         | session + role         | n/a                  | 🆕 Proposed (parity with existing Supabase-direct flow) |
| Loans                   | `/api/loans`                            | session                | ✅                   | 🆕 Proposed                                             |
| Loan Payments           | `/api/loans/:id/payments`               | session                | ✅ (inherits loan)   | 🆕 Proposed                                             |
| Dashboard/Reports       | `/api/dashboard/*`, `/api/reports/*` | session                | ✅                   | 🆕 Proposed                                             |
| AI Conversations & Chat | `/api/ai/*`                             | session                | — (user-scoped only) | ✅ Live                                                 |
| Notifications           | `/api/notifications`                    | session                | —                    | 🆕 Proposed                                             |
| Subscriptions           | `/api/subscriptions/*`                  | session                | — (user-scoped only) | ✅ Live                                                 |
| Billing webhook         | `/api/webhooks/billing`                 | Stripe signature       | —                    | ✅ Live                                                 |
