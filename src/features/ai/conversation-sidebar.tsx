'use client';

import { Box, Button, TypographyMuted, TypographySmall, toast } from '@paalstack/react-ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { archiveConversationAction } from '@/lib/actions/ai-actions';

import type { ConversationListItem } from '@/lib/ai';

type ConversationSidebarProps = {
  conversations: ConversationListItem[];
};

export const ConversationSidebar = ({ conversations }: ConversationSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleNewChat = () => router.push(`/assistant/${crypto.randomUUID()}`);

  const handleArchive = async (id: string) => {
    const result = await archiveConversationAction(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Conversation archived');
    if (pathname === `/assistant/${id}`) router.push('/assistant');
  };

  return (
    <Box className="border-border bg-card/40 flex w-64 shrink-0 flex-col border-r">
      <Box className="border-border border-b p-3">
        <Button size="sm" className="w-full" onClick={handleNewChat}>
          + New chat
        </Button>
      </Box>
      <Box className="flex-1 space-y-1 overflow-y-auto p-2">
        {conversations.length === 0 && (
          <TypographyMuted className="p-3 text-xs">No conversations yet.</TypographyMuted>
        )}
        {conversations.map((conversation) => {
          const href = `/assistant/${conversation.id}`;
          const active = pathname === href;
          return (
            <Box
              key={conversation.id}
              className={`group flex items-center gap-1 rounded-md px-2.5 py-2 text-sm transition-colors ${
                active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              }`}
            >
              <Link href={href} className="min-w-0 flex-1">
                <TypographySmall className="block truncate">
                  {conversation.title ?? 'New conversation'}
                </TypographySmall>
              </Link>
              <button
                type="button"
                onClick={() => void handleArchive(conversation.id)}
                className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
                title="Archive conversation"
                aria-label="Archive conversation"
              >
                ✕
              </button>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
