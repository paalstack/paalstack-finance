-- Self-service "join family by invite code" flow. A non-member can't SELECT
-- a families row (RLS scopes reads to existing members/owner), so the
-- lookup-by-code + membership-insert must happen atomically inside a
-- SECURITY DEFINER function rather than via two separate client requests.
--
-- Hardened per Supabase security guidance:
--   * search_path pinned to prevent schema-injection via a hijacked search path
--   * auth.uid() is checked explicitly inside the function body
--   * only the exact matching family's id/name are ever returned — no listing
--   * EXECUTE is revoked from PUBLIC/anon; only `authenticated` may call it
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

  RETURN QUERY SELECT v_family_id, v_family_name;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.join_family_by_invite_code(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.join_family_by_invite_code(text) TO authenticated;
