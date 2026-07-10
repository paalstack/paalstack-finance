'use client';

import { LuMail, LuRefreshCw } from '@paalstack/react-icons/lu';
import { Badge, Button, Card, HStack, Text, VStack, toast } from '@paalstack/react-ui';

import { ConfirmDialog } from '@/components/shared';
import { useResendFamilyInvite, useRevokeFamilyInvite } from '@/hooks/mutations';
import { useFamilyInvites } from '@/hooks/queries';
import { type FamilyInviteSummary } from '@/types';

type PendingInvitesListProps = {
  familyId: string;
};

const formatExpiry = (expiresAt: string): string => {
  const d = new Date(expiresAt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'outline' | 'secondary'> = {
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
};

const InviteRow = ({ invite, familyId }: { invite: FamilyInviteSummary; familyId: string }) => {
  const { mutate: revoke, isPending: revoking } = useRevokeFamilyInvite();
  const { mutate: resend, isPending: resending } = useResendFamilyInvite();

  const handleRevoke = () => {
    revoke(
      { inviteId: invite.id, familyId },
      {
        onSuccess: () => toast.success('Invitation revoked'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleResend = () => {
    resend(
      { inviteId: invite.id, familyId },
      {
        onSuccess: (data) =>
          toast.success(data?.emailSent ? 'Invitation resent' : 'Expiry extended'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <HStack className="border-border items-center justify-between rounded-md border p-3">
      <VStack className="gap-0.5">
        <HStack className="items-center gap-2">
          <LuMail className="text-muted-foreground size-3.5" />
          <Text className="text-sm font-medium">{invite.email}</Text>
          <Badge
            variant={ROLE_BADGE_VARIANT[invite.role] ?? 'outline'}
            label={invite.role}
            className="text-xs"
          />
        </HStack>
        <Text className="text-muted-foreground text-xs">
          Expires {formatExpiry(invite.expiresAt)}
          {invite.inviterName ? ` · Invited by ${invite.inviterName}` : ''}
        </Text>
      </VStack>

      <HStack className="items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          isLoading={resending}
          onClick={handleResend}
          className="gap-1.5"
        >
          <LuRefreshCw className="size-3.5" />
          Resend
        </Button>

        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" isLoading={revoking} className="text-destructive">
              Revoke
            </Button>
          }
          header={{
            title: 'Revoke invitation',
            description: `The invitation to ${invite.email} will be cancelled and cannot be used.`,
          }}
          confirmText="Revoke"
          confirmButtonProps={{ color: 'danger' }}
          onConfirm={handleRevoke}
        />
      </HStack>
    </HStack>
  );
};

export const PendingInvitesList = ({ familyId }: PendingInvitesListProps) => {
  const { data: invites = [], isLoading } = useFamilyInvites(familyId);

  if (isLoading) return null;
  if (invites.length === 0) return null;

  return (
    <Card
      header={{
        title: 'Pending invitations',
        description: `${invites.length} waiting`,
      }}
    >
      <VStack className="gap-3">
        {invites.map((invite) => (
          <InviteRow key={invite.id} invite={invite} familyId={familyId} />
        ))}
      </VStack>
    </Card>
  );
};
