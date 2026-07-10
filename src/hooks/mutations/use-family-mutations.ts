import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
  type CreateFamilyInput,
  type JoinFamilyInput,
  type RemoveMemberInput,
  type UpdateMemberRoleInput,
} from '@/lib/validations/family';

import { familyQueryKeys } from '../queries/use-family';
import { familyActivityQueryKeys } from '../queries/use-family-activity';

/** Short, human-typeable invite code, e.g. `7F3K-9QRT`. Collisions are
 * astronomically unlikely for this app's scale; the DB's unique index on
 * `invite_code` is the real backstop if one ever occurs. */
const generateInviteCode = (): string => {
  const raw = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 8);
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
};

/** Best-effort activity log insert via the browser Supabase client.
 * Never throws — logging failures must not roll back the primary mutation. */
const tryLogActivity = async (
  supabase: ReturnType<typeof createBrowserSupabaseClient>,
  params: {
    familyId: string;
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> => {
  try {
    await supabase.from('family_activity_log').insert({
      family_id: params.familyId,
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // Non-fatal
  }
};

export const useCreateFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFamilyInput) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          owner_id: user.id,
          name: input.name,
          description: input.description ?? null,
          currency: input.currency,
          invite_code: generateInviteCode(),
        })
        .select('id')
        .single();
      if (familyError) throw new Error(familyError.message);

      const { error: memberError } = await supabase.from('family_members').insert({
        family_id: family.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString(),
      });
      if (memberError) throw new Error(memberError.message);

      await tryLogActivity(supabase, {
        familyId: family.id,
        actorId: user.id,
        action: 'family_created',
        targetType: 'family',
        targetId: family.id,
      });

      return family;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: familyQueryKeys.all });
    },
  });
};

type JoinFamilyRpcResult = { family_id: string; family_name: string }[];

export const useJoinFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: JoinFamilyInput): Promise<JoinFamilyRpcResult> => {
      const supabase = createBrowserSupabaseClient();
      const rpcResult = (await supabase.rpc('join_family_by_invite_code', {
        p_invite_code: input.inviteCode,
      })) as { data: JoinFamilyRpcResult | null; error: { message: string } | null };
      if (rpcResult.error) throw new Error(rpcResult.error.message);
      return rpcResult.data ?? [];
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: familyQueryKeys.all });
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: UpdateMemberRoleInput & { familyId: string; previousRole?: string }
    ) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('family_members')
        .update({ role: input.role })
        .eq('id', input.memberId);
      if (error) throw new Error(error.message);

      if (user && input.familyId) {
        await tryLogActivity(supabase, {
          familyId: input.familyId,
          actorId: user.id,
          action: 'member_role_changed',
          targetType: 'member',
          targetId: input.memberId,
          metadata: { role: input.role, previousRole: input.previousRole },
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: familyQueryKeys.all });
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RemoveMemberInput & { familyId: string; targetUserId?: string }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Soft-remove: set status = 'removed' instead of deleting the row
      const { error } = await supabase
        .from('family_members')
        .update({ status: 'removed' })
        .eq('id', input.memberId);
      if (error) throw new Error(error.message);

      if (user && input.familyId) {
        await tryLogActivity(supabase, {
          familyId: input.familyId,
          actorId: user.id,
          action: 'member_removed',
          targetType: 'member',
          targetId: input.targetUserId ?? input.memberId,
        });
      }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: familyQueryKeys.all });
      if (variables.familyId) {
        await queryClient.invalidateQueries({
          queryKey: familyActivityQueryKeys.list(variables.familyId, 20),
        });
      }
    },
  });
};

export const useLeaveFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { memberId: string; familyId: string }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Soft-remove: set status = 'removed'
      const { error } = await supabase
        .from('family_members')
        .update({ status: 'removed' })
        .eq('id', params.memberId);
      if (error) throw new Error(error.message);

      if (user) {
        await tryLogActivity(supabase, {
          familyId: params.familyId,
          actorId: user.id,
          action: 'member_left',
          targetType: 'member',
          targetId: user.id,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: familyQueryKeys.all });
    },
  });
};
