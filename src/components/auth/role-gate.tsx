import { type ReactNode } from 'react';

import { type FamilyMemberRole } from '@/lib/db/schema/family-members';

type RoleGateProps = {
  role: FamilyMemberRole | null | undefined;
  allow: FamilyMemberRole[];
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * UI convenience for hiding actions the current role shouldn't see —
 * NOT a security boundary. Real enforcement is RLS (migration 0008) for
 * direct Supabase reads/writes and `requireFamilyRole` for Server
 * Actions/Route Handlers. A user can always reach the underlying request
 * directly, so every gated mutation must also be safe to call without this
 * component in the tree.
 */
export const RoleGate = ({ role, allow, children, fallback = null }: RoleGateProps) => {
  if (!role || !allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
};
