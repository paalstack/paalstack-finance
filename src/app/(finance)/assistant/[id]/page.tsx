import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AssistantView } from '@/features/ai';
import { getConversation, listConversations, toUIMessage } from '@/lib/ai';
import { getCurrentUser } from '@/lib/auth';
import { NotFoundError } from '@/lib/utils/error';

export const metadata: Metadata = { title: 'Assistant' };

type AssistantConversationPageProps = {
  params: Promise<{ id: string }>;
};

const AssistantConversationPage = async ({ params }: AssistantConversationPageProps) => {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const [conversations, conversation] = await Promise.all([
    listConversations(user.id),
    getConversation(user.id, id).catch((error) => {
      if (error instanceof NotFoundError) return null;
      throw error;
    }),
  ]);

  // A missing conversation is a valid state here — the client generates the
  // id up front (see AssistantView) and the row is only created lazily once
  // the first message is sent.
  const initialMessages = conversation
    ? conversation.messages.map((message, index) =>
        toUIMessage(message, `${conversation.id}-${index}`)
      )
    : [];

  return (
    <AssistantView
      conversations={conversations}
      conversationId={id}
      initialMessages={initialMessages}
    />
  );
};

export default AssistantConversationPage;
