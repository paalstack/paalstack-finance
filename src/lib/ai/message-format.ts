import { type UIMessage } from 'ai';

import { type AiConversationMessage } from '@/lib/db/schema';

/**
 * Pure conversion helpers between the persisted `{ role, content, createdAt }`
 * shape (`ai_conversations.messages`) and the AI SDK's `UIMessage`. Kept
 * dependency-free (no `db`/drizzle imports) so client components can safely
 * import this module to hydrate `useChat`'s initial state.
 *
 * `ai_conversations.messages` only stores the final text of each turn — tool
 * calls/results are ephemeral to a single streaming turn and not persisted.
 * `createdAt` round-trips through `UIMessage.metadata` so re-hydrated history
 * keeps its original timestamps.
 */

const TITLE_MAX_LENGTH = 60;

export const deriveConversationTitle = (firstUserMessage: string): string => {
  const trimmed = firstUserMessage.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return 'New conversation';
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}\u2026`;
};

export const toUIMessage = (message: AiConversationMessage, id: string): UIMessage => ({
  id,
  role: message.role,
  parts: [{ type: 'text', text: message.content }],
  metadata: { createdAt: message.createdAt },
});

export const fromUIMessage = (message: UIMessage): AiConversationMessage | null => {
  if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system')
    return null;

  const text = message.parts
    .filter(
      (part): part is Extract<UIMessage['parts'][number], { type: 'text' }> => part.type === 'text'
    )
    .map((part) => part.text)
    .join('');
  if (!text.trim()) return null;

  const metadata = message.metadata as { createdAt?: string } | undefined;
  return {
    role: message.role,
    content: text,
    createdAt: metadata?.createdAt ?? new Date().toISOString(),
  };
};
