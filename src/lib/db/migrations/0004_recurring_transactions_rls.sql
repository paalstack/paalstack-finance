-- recurring_transactions: fully owned by user_id.
ALTER TABLE "recurring_transactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "recurring_transactions_all_own" ON "recurring_transactions"
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
