'use client';

import { Box } from '@paalstack/react-ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ChatPanel } from './chat-panel';
import { ConversationSidebar } from './conversation-sidebar';

import type { ConversationListItem } from '@/lib/ai';
import type { UIMessage } from 'ai';

type AssistantViewProps = {
  conversations: ConversationListItem[];
  conversationId?: string;
  initialMessages?: UIMessage[];
};

export const AssistantView = ({
  conversations,
  conversationId,
  initialMessages = [],
}: AssistantViewProps) => {
  const router = useRouter();
  // A conversation row is only created lazily on the first message (see
  // POST /api/ai/chat), so visiting /assistant without an id is safe —
  // nothing is persisted until the user actually sends something.
  const [draftId] = useState(() => conversationId ?? crypto.randomUUID());

  return (
    <Box className="flex flex-1 overflow-hidden">
      <ConversationSidebar conversations={conversations} />
      <ChatPanel
        key={draftId}
        conversationId={draftId}
        initialMessages={initialMessages}
        onFirstMessage={conversationId ? undefined : () => router.replace(`/assistant/${draftId}`)}
      />
    </Box>
  );
};
