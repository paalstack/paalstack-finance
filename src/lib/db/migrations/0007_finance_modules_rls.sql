-- RLS for new modules: families, family_members, loans, loan_payments,
-- ai_conversations, notifications, subscriptions. Family-scoped tables use a
-- membership subquery against family_members so any active member of a
-- family can read/write shared data, not just the owner.

-- families: members can see families they belong to; only the owner can
-- update/delete; any authenticated user can create a family (becomes owner).
ALTER TABLE "families" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "families_select_member" ON "families"
  FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
        AND family_members.status = 'active'
    )
  );
--> statement-breakpoint
CREATE POLICY "families_insert_own" ON "families"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
--> statement-breakpoint
CREATE POLICY "families_update_own" ON "families"
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
--> statement-breakpoint
CREATE POLICY "families_delete_own" ON "families"
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);
--> statement-breakpoint

-- family_members: members of a family can see the roster; only the family
-- owner manages membership rows (writes still get double-checked
-- server-side before hitting the DB).
ALTER TABLE "family_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "family_members_select_member" ON "family_members"
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_members.family_id
        AND families.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );
--> statement-breakpoint
CREATE POLICY "family_members_write_owner" ON "family_members"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_members.family_id
        AND families.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_members.family_id
        AND families.owner_id = auth.uid()
    )
  );
--> statement-breakpoint

-- loans: owned by user_id, or visible/writable by active members of the
-- linked family.
ALTER TABLE "loans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "loans_all_own_or_family" ON "loans"
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = loans.family_id
          AND family_members.user_id = auth.uid()
          AND family_members.status = 'active'
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = loans.family_id
          AND family_members.user_id = auth.uid()
          AND family_members.status = 'active'
      )
    )
  );
--> statement-breakpoint

-- loan_payments: inherits access from the parent loan.
ALTER TABLE "loan_payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "loan_payments_all_via_loan" ON "loan_payments"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
        AND (
          loans.user_id = auth.uid()
          OR (
            loans.family_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM family_members
              WHERE family_members.family_id = loans.family_id
                AND family_members.user_id = auth.uid()
                AND family_members.status = 'active'
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
        AND (
          loans.user_id = auth.uid()
          OR (
            loans.family_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM family_members
              WHERE family_members.family_id = loans.family_id
                AND family_members.user_id = auth.uid()
                AND family_members.status = 'active'
            )
          )
        )
    )
  );
--> statement-breakpoint

-- ai_conversations: private to the owning user (family_id is contextual
-- metadata only, not a sharing boundary — chat history stays personal).
ALTER TABLE "ai_conversations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "ai_conversations_all_own" ON "ai_conversations"
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint

-- notifications: private to the owning user; inserts come from the service
-- role (billing/cron/system jobs), users only read/update/delete their own.
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "notifications_select_own" ON "notifications"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "notifications_update_own" ON "notifications"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "notifications_delete_own" ON "notifications"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
--> statement-breakpoint

-- subscriptions: read-only to the owning user; writes happen via the
-- service role from billing webhooks, never directly by end users.
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "subscriptions_select_own" ON "subscriptions"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
--> statement-breakpoint

-- transactions / budgets: extend existing "own" policies to also allow
-- active family members to see and manage family-scoped rows.
DROP POLICY IF EXISTS "transactions_all_own" ON "transactions";
--> statement-breakpoint
CREATE POLICY "transactions_all_own_or_family" ON "transactions"
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = transactions.family_id
          AND family_members.user_id = auth.uid()
          AND family_members.status = 'active'
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = transactions.family_id
          AND family_members.user_id = auth.uid()
          AND family_members.status = 'active'
      )
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "budgets_all_own" ON "budgets";
--> statement-breakpoint
CREATE POLICY "budgets_all_own_or_family" ON "budgets"
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = budgets.family_id
          AND family_members.user_id = auth.uid()
          AND family_members.status = 'active'
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = budgets.family_id
          AND family_members.user_id = auth.uid()
          AND family_members.status = 'active'
      )
    )
  );
