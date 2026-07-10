/**
 * Canonical catalogue of product analytics events. Add new events here first
 * so every call site stays type-checked against a single source of truth.
 */
export type AnalyticsEventMap = {
  account_created: { accountId: string; type: string };
  account_deleted: { accountId: string };
  transaction_created: { transactionId: string; type: string; amount: number };
  transaction_deleted: { transactionId: string };
  budget_created: { budgetId: string; period: string };
  budget_exceeded: { budgetId: string; percentUsed: number };
  ai_insight_requested: { context: string };
  ai_message_sent: { conversationId: string };
  signup_completed: { userId: string };
  login_completed: { userId: string };
  checkout_started: { plan: string; billingCycle: string };
  subscription_cancelled: { plan: string };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
