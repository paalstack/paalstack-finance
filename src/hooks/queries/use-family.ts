import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { type FamilySummary } from '@/types';

export const familyQueryKeys = {
  all: ['family'] as const,
  mine: () => [...familyQueryKeys.all, 'mine'] as const,
};

type ProfileRef = { full_name: string | null; email: string | null };

type FamilyMemberRow = {
  id: string;
  user_id: string;
  role: FamilySummary['myRole'];
  status: FamilySummary['members'][number]['status'];
  joined_at: string | null;
  profiles: ProfileRef | ProfileRef[] | null;
};

/** PostgREST returns a single object for a to-one FK relationship, but
 * supabase-js's inferred type (without generated `Database` types) can't
 * express that — it types nested selects as arrays. Normalize both shapes. */
const toProfile = (profiles: FamilyMemberRow['profiles']): ProfileRef | null =>
  Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;

const fetchMyFamily = async (): Promise<FamilySummary | null> => {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from('family_members')
    .select('id, family_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership) return null;

  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('id, name, description, currency, invite_code, owner_id')
    .eq('id', membership.family_id)
    .single();

  if (familyError) throw new Error(familyError.message);

  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('id, user_id, role, status, joined_at, profiles(full_name, email)')
    .eq('family_id', membership.family_id)
    .neq('status', 'removed')
    .order('created_at', { ascending: true });

  if (membersError) throw new Error(membersError.message);

  return {
    id: family.id as string,
    name: family.name as string,
    description: (family.description as string | null) ?? null,
    currency: family.currency as string,
    inviteCode: family.invite_code as string,
    ownerId: family.owner_id as string,
    myRole: membership.role as FamilySummary['myRole'],
    myMembershipId: membership.id as string,
    members: ((members ?? []) as unknown as FamilyMemberRow[]).map((member) => {
      const profile = toProfile(member.profiles);
      return {
        id: member.id,
        userId: member.user_id,
        role: member.role,
        status: member.status,
        fullName: profile?.full_name ?? null,
        email: profile?.email ?? null,
        joinedAt: member.joined_at,
      };
    }),
  };
};

export const useFamily = () =>
  useQuery({
    queryKey: familyQueryKeys.mine(),
    queryFn: fetchMyFamily,
  });
