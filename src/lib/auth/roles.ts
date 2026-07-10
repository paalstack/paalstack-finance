import { type FamilyMemberRole } from '@/lib/db/schema/family-members';
import { createClient } from '@/lib/supabase/server';
import { ForbiddenError, UnauthorizedError } from '@/lib/utils/error';

import { requireAuth } from './session';

export type { FamilyMemberRole } from '@/lib/db/schema/family-members';

/** Higher rank = more privilege. Used for "at least this role" checks. */
const FAMILY_ROLE_RANK: Record<FamilyMemberRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export const canManageFamily = (role: FamilyMemberRole): boolean =>
  FAMILY_ROLE_RANK[role] >= FAMILY_ROLE_RANK.admin;

export const canWriteFamilyData = (role: FamilyMemberRole): boolean =>
  FAMILY_ROLE_RANK[role] >= FAMILY_ROLE_RANK.member;

export const hasFamilyRoleAtLeast = (role: FamilyMemberRole, minimum: FamilyMemberRole): boolean =>
  FAMILY_ROLE_RANK[role] >= FAMILY_ROLE_RANK[minimum];

export type FamilyMembership = {
  familyId: string;
  role: FamilyMemberRole;
};

/**
 * Look up the caller's active membership for a family. Returns `null` when
 * the user has no active membership — never throws, so callers can branch on
 * "not a member" vs. genuine errors.
 */
export const getFamilyMembership = async (
  familyId: string,
  userId: string
): Promise<FamilyMembership | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) return null;
  return { familyId: data.family_id as string, role: data.role as FamilyMemberRole };
};

/**
 * Route/Server Action guard: require the caller to be an active member of
 * `familyId` with one of `allowedRoles`. Throws `UnauthorizedError` when
 * signed out, `ForbiddenError` when signed in but not privileged enough.
 *
 * This is app-level defense-in-depth on top of RLS — RLS is the ultimate
 * authorization boundary for direct Supabase client reads/writes, but any
 * server-side mutation path (Server Action, Route Handler) should fail fast
 * with a clear error instead of relying solely on a silent RLS-denied write.
 *
 * @example
 * const { membership } = await requireFamilyRole(familyId, ['owner', 'admin']);
 */
export const requireFamilyRole = async (familyId: string, allowedRoles: FamilyMemberRole[]) => {
  const { user, error } = await requireAuth();
  if (error || !user) throw new UnauthorizedError();

  const membership = await getFamilyMembership(familyId, user.id);
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new ForbiddenError('You do not have permission to manage this family');
  }

  return { user, membership };
};
