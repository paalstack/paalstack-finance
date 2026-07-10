/**
 * Fixed UUIDs for development seed data. Keeping these stable (instead of
 * `defaultRandom()`) makes the seed script idempotent — re-running it
 * upserts the same rows instead of creating duplicates every time.
 */
export const DEMO_IDS = {
  users: {
    owner: '11111111-1111-4111-8111-111111111111',
    spouse: '22222222-2222-4222-8222-222222222222',
  },
  family: '33333333-3333-4333-8333-333333333333',
  familyMembers: {
    owner: '33333333-1111-4111-8111-111111111111',
    spouse: '33333333-2222-4222-8222-222222222222',
  },
  accounts: {
    ownerBank: '44444444-1111-4111-8111-111111111111',
    ownerCash: '44444444-2222-4222-8222-222222222222',
    spouseBank: '44444444-3333-4333-8333-333333333333',
  },
  transactions: {
    salary: '55555555-1111-4111-8111-111111111111',
    groceries: '55555555-2222-4222-8222-222222222222',
    emi: '55555555-3333-4333-8333-333333333333',
    freelance: '55555555-4444-4444-8444-444444444444',
  },
  budgets: {
    groceries: '66666666-1111-4111-8111-111111111111',
    food: '66666666-2222-4222-8222-222222222222',
  },
  loan: '77777777-1111-4111-8111-111111111111',
  loanPayments: {
    first: '88888888-1111-4111-8111-111111111111',
    second: '88888888-2222-4222-8222-222222222222',
  },
  aiConversation: '99999999-1111-4111-8111-111111111111',
  notifications: {
    emiReminder: 'aaaaaaaa-1111-4111-8111-111111111111',
    budgetAlert: 'aaaaaaaa-2222-4222-8222-222222222222',
  },
  subscription: 'bbbbbbbb-1111-4111-8111-111111111111',
} as const;
