import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { type FamilyInviteSummary } from '@/types';

export const familyInvitesQueryKeys = {
  all: ['family-invites'] as const,
  list: (familyId: string) => [...familyInvitesQueryKeys.all, 'list', familyId] as const,
};

type InviterRef = { full_name: string | null; email: string | null } | null;
const toProfile = (v: InviterRef | InviterRef[]): InviterRef =>
  Array.isArray(v) ? (v[0] ?? null) : v;

const fetchFamilyInvites = async (familyId: string): Promise<FamilyInviteSummary[]> => {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('family_invites')
    .select(
      'id, family_id, email, role, status, invited_by, expires_at, accepted_at, created_at, profiles(full_name, email)'
    )
    .eq('family_id', familyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const inviter = toProfile(row.profiles);
    return {
      id: row.id as string,
      familyId: row.family_id as string,
      email: row.email as string,
      role: row.role as FamilyInviteSummary['role'],
      status: row.status as FamilyInviteSummary['status'],
      invitedBy: row.invited_by as string,
      inviterName: inviter?.full_name ?? inviter?.email ?? null,
      expiresAt: row.expires_at as string,
      acceptedAt: row.accepted_at as string | null,
      createdAt: row.created_at as string,
    };
  });
};

export const useFamilyInvites = (familyId: string | undefined) =>
  useQuery({
    queryKey: familyInvitesQueryKeys.list(familyId ?? ''),
    queryFn: () => fetchFamilyInvites(familyId!),
    enabled: Boolean(familyId),
  });
