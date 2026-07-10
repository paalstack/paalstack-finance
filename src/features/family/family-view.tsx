'use client';

import { Box, Grid, VStack } from '@paalstack/react-ui';

import { RoleGate } from '@/components/auth';
import { LoadingState, PageHeader } from '@/components/ui';
import { useFamily } from '@/hooks/queries';

import { CreateFamilyForm } from './create-family-form';
import { FamilyActivityFeed } from './family-activity-feed';
import { FamilyInfoCard } from './family-info-card';
import { FamilyMembersList } from './family-members-list';
import { InviteMemberForm } from './invite-member-form';
import { JoinFamilyForm } from './join-family-form';
import { PendingInvitesList } from './pending-invites-list';

export const FamilyView = () => {
  const { data: family, isLoading } = useFamily();

  const content = () => {
    if (isLoading) return <LoadingState label="Loading family…" />;

    if (family) {
      return (
        <Grid className="grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column: info + members + activity */}
          <VStack className="gap-6">
            <FamilyInfoCard family={family} />
            <FamilyMembersList family={family} />
            <FamilyActivityFeed familyId={family.id} />
          </VStack>

          {/* Right column: invite form + pending invites (owner/admin only) */}
          <RoleGate role={family.myRole} allow={['owner', 'admin']}>
            <VStack className="gap-6">
              <InviteMemberForm familyId={family.id} />
              <PendingInvitesList familyId={family.id} />
            </VStack>
          </RoleGate>
        </Grid>
      );
    }

    return (
      <Grid className="grid-cols-1 gap-6 lg:grid-cols-2">
        <CreateFamilyForm />
        <JoinFamilyForm />
      </Grid>
    );
  };

  return (
    <Box className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Family"
        description="Share accounts, budgets, and transactions with people you trust"
      />
      <Box className="p-6">{content()}</Box>
    </Box>
  );
};
