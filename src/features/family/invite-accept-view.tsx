'use client';

import { LuCircleCheck, LuCircleX } from '@paalstack/react-icons/lu';
import { Badge, Box, Button, Card, Center, Text, VStack, toast } from '@paalstack/react-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAcceptFamilyInvite } from '@/hooks/mutations';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type InviteDetails = {
  inviteId: string;
  familyId: string;
  familyName: string;
  invitedEmail: string;
  inviterName: string;
  role: string;
  status: string;
  expiresAt: string;
};

type InviteAcceptViewProps = {
  token: string;
};

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'outline' | 'secondary'> = {
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
};

export const InviteAcceptView = ({ token }: InviteAcceptViewProps) => {
  const router = useRouter();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { mutateAsync: acceptInvite, isPending: isAccepting } = useAcceptFamilyInvite();

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase.rpc('get_family_invite_by_token', {
          p_token: token,
        });

        if (error) throw new Error(error.message);
        if (!data || (Array.isArray(data) && data.length === 0)) {
          setLoadError('This invitation is invalid or has already been used.');
          return;
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setLoadError('This invitation is invalid or has already been used.');
          return;
        }

        if (row.status !== 'pending') {
          setLoadError(
            row.status === 'accepted'
              ? 'This invitation has already been accepted.'
              : 'This invitation is no longer valid.'
          );
          return;
        }

        if (new Date(row.expires_at as string) < new Date()) {
          setLoadError('This invitation has expired.');
          return;
        }

        setInvite({
          inviteId: row.invite_id as string,
          familyId: row.family_id as string,
          familyName: row.family_name as string,
          invitedEmail: row.invited_email as string,
          inviterName: row.inviter_name as string,
          role: row.role as string,
          status: row.status as string,
          expiresAt: row.expires_at as string,
        });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load invitation');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    try {
      await acceptInvite({ token });
      toast.success(`Welcome to ${invite?.familyName}!`);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  };

  if (isLoading) {
    return (
      <Center className="min-h-screen">
        <Text className="text-muted-foreground">Loading invitation…</Text>
      </Center>
    );
  }

  if (loadError) {
    return (
      <Center className="min-h-screen px-4">
        <Card className="w-full max-w-md text-center">
          <VStack className="items-center gap-4 py-4">
            <LuCircleX className="text-destructive size-12" />
            <Text className="text-lg font-semibold">Invitation unavailable</Text>
            <Text className="text-muted-foreground text-sm">{loadError}</Text>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Go to dashboard
            </Button>
          </VStack>
        </Card>
      </Center>
    );
  }

  if (!invite) return null;

  const expiry = new Date(invite.expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Center className="min-h-screen px-4">
      <Card
        className="w-full max-w-md"
        header={{
          title: `Join ${invite.familyName}`,
          description: `${invite.inviterName} has invited you to collaborate on family finances`,
        }}
      >
        <VStack className="gap-5">
          <VStack className="gap-2">
            <Box className="flex items-center gap-2">
              <Text className="text-muted-foreground text-sm">Your role:</Text>
              <Badge
                label={invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                variant={ROLE_BADGE_VARIANT[invite.role] ?? 'outline'}
              />
            </Box>
            <Text className="text-muted-foreground text-sm">
              Invitation sent to: {invite.invitedEmail}
            </Text>
            <Text className="text-muted-foreground text-xs">Expires on {expiry}</Text>
          </VStack>

          <VStack className="gap-2">
            <Button className="w-full" isLoading={isAccepting} onClick={() => void handleAccept()}>
              <LuCircleCheck className="mr-2 size-4" />
              Accept invitation
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/dashboard')}>
              Decline
            </Button>
          </VStack>
        </VStack>
      </Card>
    </Center>
  );
};
