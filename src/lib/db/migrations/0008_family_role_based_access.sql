-- Role-based access hardening. Prior migrations enabled RLS but treated every
-- active family member identically regardless of family_members.role. This
-- closes that gap: 'owner'/'admin' get management rights, 'member' gets full
-- collaborative read/write on shared finance data, 'viewer' is read-only.

-- profiles: family members need to see each other's name/email to render a
-- member roster. Scope this narrowly to co-members of an active family only.
CREATE POLICY "profiles_select_family_members" ON "profiles"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members me
      JOIN family_members them ON them.family_id = me.family_id
      WHERE me.user_id = auth.uid()
        AND me.status = 'active'
        AND them.status = 'active'
        AND them.user_id = profiles.id
    )
  );
--> statement-breakpoint

-- families: owner and admin can update settings; delete stays owner-only so
-- an admin can't unilaterally destroy the family.
DROP POLICY IF EXISTS "families_update_own" ON "families";
--> statement-breakpoint
CREATE POLICY "families_update_owner_or_admin" ON "families"
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
        AND family_members.status = 'active'
        AND family_members.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
        AND family_members.status = 'active'
        AND family_members.role = 'admin'
    )
  );
--> statement-breakpoint

-- family_members: owner and admin manage the roster (invite/remove/change
-- role). WITH CHECK blocks anyone but the owner from granting the 'owner'
-- role, so an admin can't escalate themselves or another member.
DROP POLICY IF EXISTS "family_members_write_owner" ON "family_members";
--> statement-breakpoint
CREATE POLICY "family_members_write_owner_or_admin" ON "family_members"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_members.family_id
        AND families.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
        AND fm.role = 'admin'
    )
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM families
        WHERE families.id = family_members.family_id
          AND families.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM family_members fm
        WHERE fm.family_id = family_members.family_id
          AND fm.user_id = auth.uid()
          AND fm.status = 'active'
          AND fm.role = 'admin'
      )
    )
    AND (
      family_members.role <> 'owner'
      OR EXISTS (
        SELECT 1 FROM families
        WHERE families.id = family_members.family_id
          AND families.owner_id = auth.uid()
      )
    )
  );
--> statement-breakpoint

-- family_members: any member can update/delete their own row to leave a
-- family voluntarily, independent of the owner/admin management policy above.
CREATE POLICY "family_members_leave_self" ON "family_members"
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
--> statement-breakpoint

-- loans: viewers get read-only access; owner/admin/member keep full CRUD on
-- shared or personal loans.
DROP POLICY IF EXISTS "loans_all_own_or_family" ON "loans";
--> statement-breakpoint
CREATE POLICY "loans_select_own_or_family" ON "loans"
  FOR SELECT TO authenticated
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
  );
--> statement-breakpoint
CREATE POLICY "loans_write_own_or_family_non_viewer" ON "loans"
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
          AND family_members.role <> 'viewer'
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
          AND family_members.role <> 'viewer'
      )
    )
  );
--> statement-breakpoint

-- loan_payments: inherits the same owner/family-non-viewer boundary via the
-- parent loan.
DROP POLICY IF EXISTS "loan_payments_all_via_loan" ON "loan_payments";
--> statement-breakpoint
CREATE POLICY "loan_payments_select_via_loan" ON "loan_payments"
  FOR SELECT TO authenticated
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
  );
--> statement-breakpoint
CREATE POLICY "loan_payments_write_via_loan_non_viewer" ON "loan_payments"
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
                AND family_members.role <> 'viewer'
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
                AND family_members.role <> 'viewer'
            )
          )
        )
    )
  );
--> statement-breakpoint

-- transactions: viewers get read-only access; owner/admin/member keep full
-- CRUD on shared or personal transactions.
DROP POLICY IF EXISTS "transactions_all_own_or_family" ON "transactions";
--> statement-breakpoint
CREATE POLICY "transactions_select_own_or_family" ON "transactions"
  FOR SELECT TO authenticated
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
  );
--> statement-breakpoint
CREATE POLICY "transactions_write_own_or_family_non_viewer" ON "transactions"
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
          AND family_members.role <> 'viewer'
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
          AND family_members.role <> 'viewer'
      )
    )
  );
--> statement-breakpoint

-- budgets: viewers get read-only access; owner/admin/member keep full CRUD on
-- shared or personal budgets.
DROP POLICY IF EXISTS "budgets_all_own_or_family" ON "budgets";
--> statement-breakpoint
CREATE POLICY "budgets_select_own_or_family" ON "budgets"
  FOR SELECT TO authenticated
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
  );
--> statement-breakpoint
CREATE POLICY "budgets_write_own_or_family_non_viewer" ON "budgets"
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
          AND family_members.role <> 'viewer'
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
          AND family_members.role <> 'viewer'
      )
    )
  );
