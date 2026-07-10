'use client';

import { Badge, Button, Card, HStack, Select, Text, VStack, toast } from '@paalstack/react-ui';

import { RoleGate } from '@/components/auth';
import { ConfirmDialog } from '@/components/shared';
import { useLeaveFamily, useRemoveMember, useUpdateMemberRole } from '@/hooks/mutations';
import { assignableFamilyMemberRoles, type UpdateMemberRoleInput } from '@/lib/validations/family';
import { type FamilySummary } from '@/types';

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'outline' | 'secondary'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
};

const ROLE_OPTIONS = assignableFamilyMemberRoles.map((role) => ({
  label: role.charAt(0).toUpperCase() + role.slice(1),
  value: role,
}));

type FamilyMembersListProps = {
  family: FamilySummary;
};

export const FamilyMembersList = ({ family }: FamilyMembersListProps) => {
  const canManage = family.myRole === 'owner' || family.myRole === 'admin';
  const { mutate: updateRole } = useUpdateMemberRole();
  const { mutate: removeMember } = useRemoveMember();
  const { mutateAsync: leaveFamily, isPending: isLeaving } = useLeaveFamily();

  const handleLeave = async () => {
    try {
      await leaveFamily({ memberId: family.myMembershipId, familyId: family.id });
      toast.success('Left the family');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave family');
    }
  };

  return (
    <Card header={{ title: 'Members', description: `${family.members.length} people` }}>
      <VStack className="gap-3">
        {family.members.map((member) => {
          const isSelf = member.id === family.myMembershipId;
          const isOwnerRow = member.role === 'owner';

          return (
            <HStack
              key={member.id}
              className="border-border items-center justify-between rounded-md border p-3"
            >
              <VStack className="gap-0.5">
                <Text className="text-sm font-medium">
                  {member.fullName ?? member.email ?? 'Unknown'}
                  {isSelf && <Text className="text-muted-foreground ml-1 text-xs">(you)</Text>}
                </Text>
                {member.email && (
                  <Text className="text-muted-foreground text-xs">{member.email}</Text>
                )}
              </VStack>

              <HStack className="items-center gap-2">
                <RoleGate
                  role={family.myRole}
                  allow={['owner', 'admin']}
                  fallback={<Badge variant={ROLE_BADGE_VARIANT[member.role]} label={member.role} />}
                >
                  {isOwnerRow ? (
                    <Badge variant={ROLE_BADGE_VARIANT[member.role]} label={member.role} />
                  ) : (
                    <Select
                      value={member.role}
                      onValueChange={(role) =>
                        updateRole({
                          memberId: member.id,
                          role: role as UpdateMemberRoleInput['role'],
                          familyId: family.id,
                          previousRole: member.role,
                        })
                      }
                      options={ROLE_OPTIONS}
                      triggerClassName="h-8 w-28 text-xs"
                    />
                  )}
                </RoleGate>

                {canManage && !isOwnerRow && !isSelf && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-destructive">
                        Remove
                      </Button>
                    }
                    header={{
                      title: 'Remove member',
                      description: `Remove ${member.fullName ?? member.email ?? 'this member'} from the family?`,
                    }}
                    confirmText="Remove"
                    confirmButtonProps={{ color: 'danger' }}
                    onConfirm={() =>
                      removeMember({
                        memberId: member.id,
                        familyId: family.id,
                        targetUserId: member.userId,
                      })
                    }
                  />
                )}

                {isSelf && !isOwnerRow && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" isLoading={isLeaving}>
                        Leave
                      </Button>
                    }
                    header={{
                      title: 'Leave family',
                      description:
                        "You'll lose access to shared accounts, transactions, and budgets.",
                    }}
                    confirmText="Leave"
                    confirmButtonProps={{ color: 'danger' }}
                    onConfirm={() => void handleLeave()}
                  />
                )}
              </HStack>
            </HStack>
          );
        })}
      </VStack>
    </Card>
  );
};
