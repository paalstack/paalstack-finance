import { useQuery } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { type FamilyActivityLogEntry } from '@/types';

export const familyActivityQueryKeys = {
  all: ['family-activity'] as const,
  list: (familyId: string, limit: number) =>
    [...familyActivityQueryKeys.all, 'list', familyId, limit] as const,
};

type ActorRef = { full_name: string | null; email: string | null } | null;
const toProfile = (v: ActorRef | ActorRef[]): ActorRef => (Array.isArray(v) ? (v[0] ?? null) : v);

const fetchFamilyActivity = async (
  familyId: string,
  limit: number
): Promise<FamilyActivityLogEntry[]> => {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('family_activity_log')
    .select(
      'id, family_id, actor_id, action, target_type, target_id, metadata, created_at, profiles(full_name, email)'
    )
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const actor = toProfile(row.profiles);
    return {
      id: row.id as string,
      familyId: row.family_id as string,
      actorId: row.actor_id as string | null,
      actorName: actor?.full_name ?? actor?.email ?? null,
      action: row.action as FamilyActivityLogEntry['action'],
      targetType: row.target_type as string | null,
      targetId: row.target_id as string | null,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.created_at as string,
    };
  });
};

export const useFamilyActivity = (familyId: string | undefined, limit = 20) =>
  useQuery({
    queryKey: familyActivityQueryKeys.list(familyId ?? '', limit),
    queryFn: () => fetchFamilyActivity(familyId!, limit),
    enabled: Boolean(familyId),
  });
