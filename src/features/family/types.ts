/**
 * Family/shared-finances domain contracts. Backed by the `families` /
 * `family_members` tables, role-aware RLS policies (migration 0008), and the
 * `join_family_by_invite_code` RPC (migration 0009). See `family-view.tsx`
 * for the wired UI and `@/hooks/queries/use-family` / `use-family-mutations`
 * for the data layer.
 */
export type { FamilyMemberRole, FamilyMemberStatus } from '@/lib/db/schema/family-members';
export type { FamilyInviteStatus } from '@/lib/db/schema/family-invites';
export type { FamilyActivityAction } from '@/lib/db/schema/family-activity-log';
export type {
  FamilySummary,
  FamilyMemberSummary,
  FamilyInviteSummary,
  FamilyActivityLogEntry,
} from '@/types/finance';
