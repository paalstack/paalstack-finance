'use client';

import { Box, Card, Text, VStack } from '@paalstack/react-ui';
import { cn } from '@paalstack/react-ui/lib';

import { useFamilyActivity } from '@/hooks/queries';
import { type FamilyActivityAction, type FamilyActivityLogEntry } from '@/types';

type FamilyActivityFeedProps = {
  familyId: string;
};

const ACTION_LABELS: Record<FamilyActivityAction, (entry: FamilyActivityLogEntry) => string> = {
  family_created: (e) => `${e.actorName ?? 'Someone'} created this family`,
  family_updated: (e) => `${e.actorName ?? 'Someone'} updated family settings`,
  member_invited: (e) => {
    const email = (e.metadata?.email as string | null) ?? 'someone';
    const role = (e.metadata?.role as string | null) ?? 'member';
    return `${e.actorName ?? 'Someone'} invited ${email} as ${role}`;
  },
  member_joined: (e) => {
    const email = e.metadata?.email as string | null;
    return `${email ?? e.actorName ?? 'Someone'} joined the family`;
  },
  member_removed: (e) => `${e.actorName ?? 'Someone'} removed a member`,
  member_left: (e) => `${e.actorName ?? 'Someone'} left the family`,
  member_role_changed: (e) => {
    const role = e.metadata?.role as string | null;
    return `${e.actorName ?? 'Someone'} changed a member's role${role ? ` to ${role}` : ''}`;
  },
  invite_revoked: (e) => {
    const email = (e.metadata?.email as string | null) ?? 'someone';
    return `${e.actorName ?? 'Someone'} revoked the invitation to ${email}`;
  },
  invite_resent: (e) => {
    const email = (e.metadata?.email as string | null) ?? 'someone';
    return `${e.actorName ?? 'Someone'} resent the invitation to ${email}`;
  },
};

const ACTION_DOT: Partial<Record<FamilyActivityAction, string>> = {
  family_created: 'bg-success',
  member_joined: 'bg-success',
  member_invited: 'bg-info',
  invite_resent: 'bg-info',
  member_removed: 'bg-destructive',
  member_left: 'bg-warning',
  invite_revoked: 'bg-warning',
  member_role_changed: 'bg-secondary',
  family_updated: 'bg-muted-foreground',
};

const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const FamilyActivityFeed = ({ familyId }: FamilyActivityFeedProps) => {
  const { data: entries = [], isLoading } = useFamilyActivity(familyId, 20);

  if (isLoading || entries.length === 0) return null;

  return (
    <Card header={{ title: 'Activity', description: 'Recent family events' }}>
      <VStack className="gap-0">
        {entries.map((entry, i) => {
          const label = ACTION_LABELS[entry.action]?.(entry) ?? entry.action;
          const dotColor = ACTION_DOT[entry.action] ?? 'bg-muted-foreground';

          return (
            <VStack
              key={entry.id}
              className={cn(
                'relative pl-5',
                i !== entries.length - 1 && 'border-border mb-3 border-b pb-3'
              )}
            >
              <Box className={cn('absolute top-1.5 left-0 size-2 rounded-full', dotColor)} />
              <Text className="text-sm leading-snug">{label}</Text>
              <Text className="text-muted-foreground text-xs">
                {formatRelative(entry.createdAt)}
              </Text>
            </VStack>
          );
        })}
      </VStack>
    </Card>
  );
};
