import { z } from 'zod';

export const createFamilySchema = z.object({
  name: z.string().trim().min(2, 'Family name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
  currency: z.string().length(3, 'Use a 3-letter currency code'),
});

export const joinFamilySchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(4, 'Enter a valid invite code')
    .max(32)
    .transform((value) => value.toUpperCase()),
});

/** 'owner' is intentionally excluded — ownership transfer is a separate,
 * more sensitive flow that isn't handled by a simple role dropdown. */
export const assignableFamilyMemberRoles = ['admin', 'member', 'viewer'] as const;

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(assignableFamilyMemberRoles),
});

export const removeMemberSchema = z.object({
  memberId: z.string().uuid(),
});

export const createFamilyInviteSchema = z.object({
  familyId: z.string().uuid(),
  email: z.string().trim().email('Enter a valid email address'),
  role: z.enum(assignableFamilyMemberRoles),
});

export const acceptFamilyInviteSchema = z.object({
  token: z.string().min(16, 'Invalid invite token'),
});

export const revokeFamilyInviteSchema = z.object({
  inviteId: z.string().uuid(),
  familyId: z.string().uuid(),
});

export const resendFamilyInviteSchema = z.object({
  inviteId: z.string().uuid(),
  familyId: z.string().uuid(),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type JoinFamilyInput = z.infer<typeof joinFamilySchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type CreateFamilyInviteInput = z.infer<typeof createFamilyInviteSchema>;
export type AcceptFamilyInviteInput = z.infer<typeof acceptFamilyInviteSchema>;
export type RevokeFamilyInviteInput = z.infer<typeof revokeFamilyInviteSchema>;
export type ResendFamilyInviteInput = z.infer<typeof resendFamilyInviteSchema>;
