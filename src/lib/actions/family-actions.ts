'use server';

import crypto from 'crypto';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { logFamilyActivity } from '@/lib/actions/_shared/activity-log';
import { requireFamilyRole } from '@/lib/auth/roles';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { familyInvites } from '@/lib/db/schema/family-invites';
import { familyMembers } from '@/lib/db/schema/family-members';
import { isEmailEnabled, sendFamilyInviteEmail } from '@/lib/email/client';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { ForbiddenError, UnauthorizedError } from '@/lib/utils/error';
import { logger } from '@/lib/utils/logger';
import {
  type AcceptFamilyInviteInput,
  type CreateFamilyInviteInput,
  type ResendFamilyInviteInput,
  type RevokeFamilyInviteInput,
  acceptFamilyInviteSchema,
  createFamilyInviteSchema,
  resendFamilyInviteSchema,
  revokeFamilyInviteSchema,
} from '@/lib/validations/family';
import { type ActionResult } from '@/types';

import type { FamilyInvite } from '@/lib/db/schema/family-invites';

const revalidate = () => revalidatePath('/settings/family');

const INVITE_EXPIRY_DAYS = 7;

const generateInviteToken = (): string => crypto.randomBytes(32).toString('hex');

const buildAcceptUrl = (token: string): string => `${env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

type ProfileRef = { full_name: string | null; email: string | null } | null;
const toProfile = (v: ProfileRef | ProfileRef[]): ProfileRef =>
  Array.isArray(v) ? (v[0] ?? null) : v;

// ── Create invite ─────────────────────────────────────────────────────────────

export const createFamilyInviteAction = async (
  input: CreateFamilyInviteInput
): Promise<ActionResult<{ invite: FamilyInvite; acceptUrl: string; emailSent: boolean }>> => {
  const parsed = createFamilyInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { user } = await requireFamilyRole(parsed.data.familyId, ['owner', 'admin']);

    const { familyId, email, role } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const supabase = await createClient();

    // Reject if already an active member with this email
    const { data: activeMembers } = await supabase
      .from('family_members')
      .select('id, profiles(email)')
      .eq('family_id', familyId)
      .eq('status', 'active');

    const alreadyMember = (activeMembers ?? []).some((m) => {
      const profile = toProfile(m.profiles as ProfileRef | ProfileRef[]);
      return profile?.email?.toLowerCase() === normalizedEmail;
    });

    if (alreadyMember) {
      return { success: false, error: 'This person is already a family member' };
    }

    // Reject if pending invite already exists for this email
    const existingPending = await db
      .select({ id: familyInvites.id })
      .from(familyInvites)
      .where(
        and(
          eq(familyInvites.familyId, familyId),
          eq(familyInvites.status, 'pending'),
          eq(familyInvites.email, normalizedEmail)
        )
      )
      .limit(1);

    if (existingPending.length > 0) {
      return { success: false, error: 'An invite has already been sent to this email address' };
    }

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const acceptUrl = buildAcceptUrl(token);

    const [invite] = await db
      .insert(familyInvites)
      .values({ familyId, email: normalizedEmail, role, token, invitedBy: user.id, expiresAt })
      .returning();

    if (!invite) return { success: false, error: 'Failed to create invite' };

    await logFamilyActivity(db, {
      familyId,
      actorId: user.id,
      action: 'member_invited',
      targetType: 'invite',
      targetId: invite.id,
      metadata: { email: normalizedEmail, role },
    });

    let emailSent = false;
    if (isEmailEnabled()) {
      try {
        const [{ data: inviterProfile }, { data: familyData }] = await Promise.all([
          supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
          supabase.from('families').select('name').eq('id', familyId).single(),
        ]);
        const inviterProfileTyped = inviterProfile;
        await sendFamilyInviteEmail({
          to: normalizedEmail,
          familyName: (familyData?.name as string | null) ?? 'your family',
          inviterName:
            inviterProfileTyped?.full_name ?? inviterProfileTyped?.email ?? 'A family member',
          role,
          acceptUrl,
          expiresAt,
        });
        emailSent = true;
      } catch (emailError) {
        logger.warn('[createFamilyInviteAction] Email delivery failed', { emailError });
      }
    }

    revalidate();
    return { success: true, data: { invite, acceptUrl, emailSent } };
  } catch (error) {
    logger.error('[createFamilyInviteAction]', { error });
    return { success: false, error: 'Failed to create invite' };
  }
};

// ── Revoke invite ─────────────────────────────────────────────────────────────

export const revokeFamilyInviteAction = async (
  input: RevokeFamilyInviteInput
): Promise<ActionResult<{ id: string }>> => {
  const parsed = revokeFamilyInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { user } = await requireFamilyRole(parsed.data.familyId, ['owner', 'admin']);

    const existing = await db.query.familyInvites.findFirst({
      where: and(
        eq(familyInvites.id, parsed.data.inviteId),
        eq(familyInvites.familyId, parsed.data.familyId),
        eq(familyInvites.status, 'pending')
      ),
    });

    if (!existing) return { success: false, error: 'Pending invite not found' };

    await db
      .update(familyInvites)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(eq(familyInvites.id, parsed.data.inviteId));

    await logFamilyActivity(db, {
      familyId: parsed.data.familyId,
      actorId: user.id,
      action: 'invite_revoked',
      targetType: 'invite',
      targetId: existing.id,
      metadata: { email: existing.email },
    });

    revalidate();
    return { success: true, data: { id: parsed.data.inviteId } };
  } catch (error) {
    logger.error('[revokeFamilyInviteAction]', { error });
    return { success: false, error: 'Failed to revoke invite' };
  }
};

// ── Resend invite ─────────────────────────────────────────────────────────────

export const resendFamilyInviteAction = async (
  input: ResendFamilyInviteInput
): Promise<ActionResult<{ emailSent: boolean }>> => {
  const parsed = resendFamilyInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { user } = await requireFamilyRole(parsed.data.familyId, ['owner', 'admin']);

    const existing = await db.query.familyInvites.findFirst({
      where: and(
        eq(familyInvites.id, parsed.data.inviteId),
        eq(familyInvites.familyId, parsed.data.familyId),
        eq(familyInvites.status, 'pending')
      ),
    });

    if (!existing) return { success: false, error: 'Pending invite not found' };

    const newExpiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await db
      .update(familyInvites)
      .set({ expiresAt: newExpiresAt, updatedAt: new Date() })
      .where(eq(familyInvites.id, parsed.data.inviteId));

    await logFamilyActivity(db, {
      familyId: parsed.data.familyId,
      actorId: user.id,
      action: 'invite_resent',
      targetType: 'invite',
      targetId: existing.id,
      metadata: { email: existing.email },
    });

    let emailSent = false;
    if (isEmailEnabled()) {
      try {
        const supabase = await createClient();
        const [{ data: inviterProfile }, { data: familyData }] = await Promise.all([
          supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
          supabase.from('families').select('name').eq('id', parsed.data.familyId).single(),
        ]);
        const inviterProfileTyped = inviterProfile;
        await sendFamilyInviteEmail({
          to: existing.email,
          familyName: (familyData?.name as string | null) ?? 'your family',
          inviterName:
            inviterProfileTyped?.full_name ?? inviterProfileTyped?.email ?? 'A family member',
          role: existing.role,
          acceptUrl: buildAcceptUrl(existing.token),
          expiresAt: newExpiresAt,
        });
        emailSent = true;
      } catch (emailError) {
        logger.warn('[resendFamilyInviteAction] Email delivery failed', { emailError });
      }
    }

    revalidate();
    return { success: true, data: { emailSent } };
  } catch (error) {
    logger.error('[resendFamilyInviteAction]', { error });
    return { success: false, error: 'Failed to resend invite' };
  }
};

// ── Accept invite ─────────────────────────────────────────────────────────────

export const acceptFamilyInviteAction = async (
  input: AcceptFamilyInviteInput
): Promise<ActionResult<{ familyId: string }>> => {
  const parsed = acceptFamilyInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const { user, error: authError } = await requireAuth();
    if (authError || !user) throw new UnauthorizedError();

    const invite = await db.query.familyInvites.findFirst({
      where: eq(familyInvites.token, parsed.data.token),
    });

    if (!invite) return { success: false, error: 'Invalid or expired invitation' };

    if (invite.status !== 'pending') {
      return {
        success: false,
        error:
          invite.status === 'accepted'
            ? 'This invitation has already been accepted'
            : 'This invitation is no longer valid',
      };
    }

    if (new Date(invite.expiresAt) < new Date()) {
      await db
        .update(familyInvites)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(familyInvites.id, invite.id));
      return { success: false, error: 'This invitation has expired' };
    }

    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      throw new ForbiddenError(
        'This invitation was sent to a different email address. Please sign in with the invited email.'
      );
    }

    await db
      .insert(familyMembers)
      .values({
        familyId: invite.familyId,
        userId: user.id,
        role: invite.role,
        status: 'active',
        invitedBy: invite.invitedBy,
        joinedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [familyMembers.familyId, familyMembers.userId],
        set: { role: invite.role, status: 'active', joinedAt: new Date(), updatedAt: new Date() },
      });

    await db
      .update(familyInvites)
      .set({ status: 'accepted', acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(familyInvites.id, invite.id));

    await logFamilyActivity(db, {
      familyId: invite.familyId,
      actorId: user.id,
      action: 'member_joined',
      targetType: 'member',
      targetId: user.id,
      metadata: { email: user.email, role: invite.role },
    });

    revalidatePath('/', 'layout');
    return { success: true, data: { familyId: invite.familyId } };
  } catch (error) {
    if (error instanceof ForbiddenError) return { success: false, error: error.message };
    if (error instanceof UnauthorizedError)
      return { success: false, error: 'Authentication required' };
    logger.error('[acceptFamilyInviteAction]', { error });
    return { success: false, error: 'Failed to accept invitation' };
  }
};
