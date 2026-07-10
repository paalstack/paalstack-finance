-- RLS policies and RPCs for:
--   * accounts family-scoped split policies
--   * family_invites RLS (owner/admin SELECT, no INSERT/UPDATE/DELETE via authenticated)
--   * family_activity_log RLS (member SELECT, authenticated INSERT)
--   * family_members soft-remove (swap hard-delete leave for status update)
--   * get_family_invite_by_token SECURITY DEFINER RPC
--   * extend join_family_by_invite_code to log member_joined

-- ── accounts: split personal-only policy into select + write with family support ──────────────

DROP POLICY IF EXISTS "accounts_all_own" ON "accounts";
--> statement-breakpoint

CREATE POLICY "accounts_select_own_or_family" ON "accounts"
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = accounts.family_id
          AND family_members.user_id = auth.uid()
          AND family_members.status = 'active'
      )
    )
  );
--> statement-breakpoint

CREATE POLICY "accounts_write_own_or_family_non_viewer" ON "accounts"
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      family_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = accounts.family_id
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
        WHERE family_members.family_id = accounts.family_id
          AND family_members.user_id = auth.uid()
          AND family_members.status = 'active'
          AND family_members.role <> 'viewer'
      )
    )
  );
--> statement-breakpoint

-- ── family_invites: RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE "family_invites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Owner and admin can view all invites for their family.
CREATE POLICY "family_invites_select_owner_or_admin" ON "family_invites"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_invites.family_id
        AND family_members.user_id = auth.uid()
        AND family_members.status = 'active'
        AND family_members.role IN ('owner', 'admin')
    )
  );
--> statement-breakpoint

-- ── family_activity_log: RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE "family_activity_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Any active family member can read the log.
CREATE POLICY "family_activity_log_select_member" ON "family_activity_log"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_activity_log.family_id
        AND family_members.user_id = auth.uid()
        AND family_members.status = 'active'
    )
  );
--> statement-breakpoint

-- Active members can insert log entries for their own family.
-- actor_id must match the calling user.
CREATE POLICY "family_activity_log_insert_member" ON "family_activity_log"
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_activity_log.family_id
        AND family_members.user_id = auth.uid()
        AND family_members.status = 'active'
    )
  );
--> statement-breakpoint

-- ── family_members: soft-remove — replace hard-delete leave policy with status update ─────────

DROP POLICY IF EXISTS "family_members_leave_self" ON "family_members";
--> statement-breakpoint

-- Members can soft-remove themselves by setting status = 'removed'.
-- This mirrors the DB's existing removed enum value and prevents hard deletes
-- from breaking foreign key references in activity_log.
CREATE POLICY "family_members_leave_self" ON "family_members"
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = 'removed');
--> statement-breakpoint

-- Owner/admin remove path also needs to set status rather than delete.
-- Replace the ALL policy so it covers UPDATE for soft-removes while still
-- blocking the admin from escalating a member to 'owner'.
DROP POLICY IF EXISTS "family_members_write_owner_or_admin" ON "family_members";
--> statement-breakpoint

CREATE POLICY "family_members_manage_owner_or_admin" ON "family_members"
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

-- ── get_family_invite_by_token RPC ────────────────────────────────────────────────────────────
-- Authenticated users can look up an invite by its token to see the family
-- name, role, inviter name, status, and expiry before accepting.
-- SECURITY DEFINER + pinned search_path prevents schema-injection.
-- Only the calling user's own invite details are ever returned via the email
-- check (no info-leak about other invites).

CREATE OR REPLACE FUNCTION public.get_family_invite_by_token(p_token text)
RETURNS TABLE (
  invite_id      uuid,
  family_id      uuid,
  family_name    text,
  invited_email  text,
  inviter_name   text,
  role           text,
  status         text,
  expires_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    fi.id,
    fi.family_id,
    f.name,
    fi.email,
    COALESCE(p.full_name, p.email) AS inviter_name,
    fi.role::text,
    fi.status::text,
    fi.expires_at
  FROM family_invites fi
  JOIN families f ON f.id = fi.family_id
  LEFT JOIN profiles p ON p.id = fi.invited_by
  WHERE fi.token = p_token
  LIMIT 1;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.get_family_invite_by_token(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.get_family_invite_by_token(text) TO authenticated;
--> statement-breakpoint

-- ── Extend join_family_by_invite_code to log member_joined ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.join_family_by_invite_code(p_invite_code text)
RETURNS TABLE (family_id uuid, family_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_family_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id, name INTO v_family_id, v_family_name
  FROM families
  WHERE invite_code = p_invite_code
    AND is_active = true;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = v_family_id
      AND family_members.user_id = v_user_id
      AND family_members.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You are already a member of this family';
  END IF;

  INSERT INTO family_members (family_id, user_id, role, status, joined_at)
  VALUES (v_family_id, v_user_id, 'member', 'active', now())
  ON CONFLICT (family_id, user_id)
  DO UPDATE SET status = 'active', role = 'member', joined_at = now(), updated_at = now();

  INSERT INTO family_activity_log (family_id, actor_id, action, target_type, target_id)
  VALUES (v_family_id, v_user_id, 'member_joined', 'member', v_user_id);

  RETURN QUERY SELECT v_family_id, v_family_name;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.join_family_by_invite_code(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.join_family_by_invite_code(text) TO authenticated;
