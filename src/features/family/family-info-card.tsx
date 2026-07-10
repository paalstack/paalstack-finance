'use client';

import { LuCopy } from '@paalstack/react-icons/lu';
import { Badge, Button, Card, HStack, Text, VStack, toast } from '@paalstack/react-ui';

import { RoleGate } from '@/components/auth';
import { type FamilySummary } from '@/types';

type FamilyInfoCardProps = {
  family: FamilySummary;
};

export const FamilyInfoCard = ({ family }: FamilyInfoCardProps) => {
  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(family.inviteCode);
    toast.success('Invite code copied');
  };

  return (
    <Card
      header={{ title: family.name, description: family.description ?? undefined }}
      action={<Badge label={`Your role: ${family.myRole}`} variant="outline" />}
    >
      <VStack className="gap-2">
        <Text className="text-muted-foreground text-sm">Currency: {family.currency}</Text>
        <RoleGate role={family.myRole} allow={['owner', 'admin']}>
          <HStack className="items-center gap-2">
            <Text className="text-muted-foreground text-sm">Invite code:</Text>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copyInviteCode()}
              className="gap-1.5 font-mono text-xs"
            >
              {family.inviteCode}
              <LuCopy className="size-3.5" />
            </Button>
          </HStack>
        </RoleGate>
      </VStack>
    </Card>
  );
};
