import { getFamilyMembership, canWriteFamilyData } from '@/lib/auth/roles';
import { requireAuth } from '@/lib/auth/session';
import { ForbiddenError, UnauthorizedError } from '@/lib/utils/error';

/**
 * Guard for any owned-or-family-write operation.
 * - No familyId → just verifies authenticated user, returns userId.
 * - With familyId → additionally checks active membership + member+ role.
 * Throws UnauthorizedError or ForbiddenError on failure.
 */
export const assertAuthWrite = async (familyId?: string): Promise<{ userId: string }> => {
  const { user, error } = await requireAuth();
  if (error || !user) throw new UnauthorizedError();

  if (familyId) {
    const membership = await getFamilyMembership(familyId, user.id);
    if (!membership || !canWriteFamilyData(membership.role)) {
      throw new ForbiddenError('You do not have permission to write to this family');
    }
  }

  return { userId: user.id };
};
