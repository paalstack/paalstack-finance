-- 0013 fixed the self-referencing recursion within family_members' own
-- policies, but missed a second, cross-table cycle:
--
--   family_members_select_member  -> queries "families" directly (owner check)
--   families_select_member        -> queries "family_members" directly (member check)
--   family_members_manage_owner_or_admin (WITH CHECK) -> queries "families" directly
--   families_update_owner_or_admin       -> queries "family_members" directly
--
-- Each side individually looks harmless, but evaluating either policy now
-- requires evaluating the other table's RLS, which requires evaluating the
-- first table's RLS again — infinite recursion, confirmed live:
--   "infinite recursion detected in policy for relation family_members"
--
-- Fix: move the remaining direct cross-table EXISTS checks into the same
-- SECURITY DEFINER pattern used in 0013, so every "is this family_id linked
-- to auth.uid() as owner/admin/member" check runs with RLS bypassed
-- internally and never re-enters either table's policies.

CREATE OR REPLACE FUNCTION public.is_family_owner(p_family_id uuid, p_user_id uuid DEFAULT auth.uid())
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
  );
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.is_family_owner(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_family_owner(uuid, uuid) TO authenticated;
--> statement-breakpoint

-- family_members: SELECT — replace the direct families.owner_id lookup with
-- the helper so it no longer triggers families' own RLS from within
-- family_members' policy.
DROP POLICY IF EXISTS "family_members_select_member" ON "family_members";
--> statement-breakpoint
CREATE POLICY "family_members_select_member" ON "family_members"
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_family_owner(family_members.family_id)
    OR public.is_active_family_member(family_members.family_id)
  );
--> statement-breakpoint

-- family_members: ALL (owner/admin roster management) — same fix for the
-- anti-escalation guard's owner lookup. Deliberately kept owner-only (not
-- is_family_owner_or_admin) so an admin still can't grant the 'owner' role.
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
      OR public.is_family_owner(family_members.family_id)
    )
  );
--> statement-breakpoint

-- families: SELECT — replace the direct family_members membership lookup
-- with the helper so it no longer triggers family_members' RLS from within
-- families' policy.
DROP POLICY IF EXISTS "families_select_member" ON "families";
--> statement-breakpoint
CREATE POLICY "families_select_member" ON "families"
  FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.is_active_family_member(families.id)
  );
--> statement-breakpoint

-- families: UPDATE — owner/admin settings management, same fix.
DROP POLICY IF EXISTS "families_update_owner_or_admin" ON "families";
--> statement-breakpoint
CREATE POLICY "families_update_owner_or_admin" ON "families"
  FOR UPDATE TO authenticated
  USING (
    public.is_family_owner_or_admin(families.id)
  )
  WITH CHECK (
    public.is_family_owner_or_admin(families.id)
  );
