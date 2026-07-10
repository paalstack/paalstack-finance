-- Row Level Security policies.
-- RLS is already enabled by default on new tables in this Supabase project;
-- these policies scope every table to its owning user (auth.uid()).

-- profiles: a user can only see/create/update their own row.
CREATE POLICY "profiles_select_own" ON "profiles"
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
--> statement-breakpoint
CREATE POLICY "profiles_insert_own" ON "profiles"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles"
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
--> statement-breakpoint

-- accounts: fully owned by user_id.
CREATE POLICY "accounts_all_own" ON "accounts"
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint

-- categories: users can read their own categories plus shared system
-- defaults (user_id is null), but can only write their own.
CREATE POLICY "categories_select_own_or_system" ON "categories"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_system = true);
--> statement-breakpoint
CREATE POLICY "categories_insert_own" ON "categories"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "categories_update_own" ON "categories"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "categories_delete_own" ON "categories"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
--> statement-breakpoint

-- transactions: fully owned by user_id.
CREATE POLICY "transactions_all_own" ON "transactions"
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint

-- budgets: fully owned by user_id.
CREATE POLICY "budgets_all_own" ON "budgets"
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
