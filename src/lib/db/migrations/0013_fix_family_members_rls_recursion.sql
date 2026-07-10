-- Fixes "infinite recursion detected in policy for relation family_members".
--
-- family_members_select_member (0007) and family_members_manage_owner_or_admin
-- (0012) both self-referenced family_members from within their own USING/WITH
-- CHECK clauses (aliased as `fm`). Evaluating that subquery re-triggers RLS on
-- family_members, which re-evaluates the same policy, forever — Postgres
-- detects the cycle and errors instead of looping. This also broke every
-- other table whose policy queries family_members (transactions, budgets,
-- loans, accounts, profiles, ...) since they all hit the same recursive
-- SELECT policy as soon as they subquery the table.
--
-- Fix: move the "is the current user an active member / admin-or-owner of
-- this family" checks into SECURITY DEFINER helper functions. Functions
-- owned by the migration role bypass RLS internally, so the lookup they run
-- against family_members never re-enters policy evaluation.

CREATE OR REPLACE FUNCTION public.is_active_family_member(p_family_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = p_family_id
      AND family_members.user_id = p_user_id
      AND family_members.status = 'active'
  );
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.is_active_family_member(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_active_family_member(uuid, uuid) TO authenticated;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_family_owner_or_admin(p_family_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM families
    WHERE families.id = p_family_id
      AND families.owner_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = p_family_id
      AND family_members.user_id = p_user_id
      AND family_members.status = 'active'
      AND family_members.role = 'admin'
  );
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.is_family_owner_or_admin(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_family_owner_or_admin(uuid, uuid) TO authenticated;
--> statement-breakpoint

-- family_members: SELECT — replace the self-referencing `fm` subquery with
-- the SECURITY DEFINER helper.
DROP POLICY IF EXISTS "family_members_select_member" ON "family_members";
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
    OR public.is_active_family_member(family_members.family_id)
  );
--> statement-breakpoint

-- family_members: ALL (owner/admin roster management) — same fix for the
-- admin-membership check. The direct families.owner_id checks are untouched
-- since they query "families", not "family_members", and aren't recursive.
DROP POLICY IF EXISTS "family_members_manage_owner_or_admin" ON "family_members";
--> statement-breakpoint
CREATE POLICY "family_members_manage_owner_or_admin" ON "family_members"
  FOR ALL TO authenticated
  USING (
    public.is_family_owner_or_admin(family_members.family_id)
  )
  WITH CHECK (
    public.is_family_owner_or_admin(family_members.family_id)
    AND (
      family_members.role <> 'owner'
      OR EXISTS (
        SELECT 1 FROM families
        WHERE families.id = family_members.family_id
          AND families.owner_id = auth.uid()
      )
    )
  );
