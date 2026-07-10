import { type UIMessage } from 'ai';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { aiConversations } from '@/lib/db/schema';
import { DatabaseError, NotFoundError } from '@/lib/utils/error';

import { deriveConversationTitle, fromUIMessage } from './message-format';

export type ConversationListItem = {
  id: string;
  title: string | null;
  model: string | null;
  lastMessageAt: Date | null;
  isArchived: boolean;
  createdAt: Date;
};

export const listConversations = async (
  userId: string,
  { isArchived = false, familyId }: { isArchived?: boolean; familyId?: string } = {}
): Promise<ConversationListItem[]> =>
  db.query.aiConversations.findMany({
    where: and(
      eq(aiConversations.userId, userId),
      eq(aiConversations.isArchived, isArchived),
      familyId ? eq(aiConversations.familyId, familyId) : undefined
    ),
    orderBy: desc(aiConversations.lastMessageAt),
    columns: {
      id: true,
      title: true,
      model: true,
      lastMessageAt: true,
      isArchived: true,
      createdAt: true,
    },
  });

export const findConversation = async (userId: string, conversationId: string) =>
  db.query.aiConversations.findFirst({
    where: and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)),
  });

export const getConversation = async (userId: string, conversationId: string) => {
  const conversation = await findConversation(userId, conversationId);
  if (!conversation) throw new NotFoundError('Conversation');
  return conversation;
};

export const createConversation = async (
  userId: string,
  {
    id,
    title,
    model,
    familyId,
  }: { id?: string; title?: string; model?: string; familyId?: string | null } = {}
): Promise<string> => {
  const [row] = await db
    .insert(aiConversations)
    .values({
      ...(id ? { id } : {}),
      userId,
      familyId: familyId ?? null,
      title: title ?? null,
      model: model ?? null,
      messages: [],
    })
    .returning({ id: aiConversations.id });
  if (!row) throw new DatabaseError('Failed to create conversation');
  return row.id;
};

/**
 * Ensures a conversation row exists for `conversationId`, owned by `userId`.
 * Used by the chat route so the client can generate a UUID up-front (for
 * immediate `/assistant/[id]` routing) without a separate "create" round
 * trip before the first message.
 */
export const ensureConversation = async (
  userId: string,
  conversationId: string,
  { model, familyId }: { model?: string; familyId?: string | null } = {}
): Promise<void> => {
  const existing = await findConversation(userId, conversationId);
  if (existing) return;
  await createConversation(userId, { id: conversationId, model, familyId });
};

/**
 * Overwrites a conversation's message history from the client's full
 * `UIMessage[]` state after a completed streaming turn. Replacing (rather
 * than appending) sidesteps any risk of double-counting messages the client
 * already had — the client's post-stream array is always the source of truth.
 */
export const syncConversationMessages = async (
  userId: string,
  conversationId: string,
  uiMessages: UIMessage[],
  model?: string
): Promise<void> => {
  const conversation = await getConversation(userId, conversationId);

  const messages = uiMessages
    .map(fromUIMessage)
    .filter((m): m is NonNullable<ReturnType<typeof fromUIMessage>> => m !== null);
  const firstUserMessage = messages.find((m) => m.role === 'user');
  const title =
    conversation.title ??
    (firstUserMessage ? deriveConversationTitle(firstUserMessage.content) : null);

  await db
    .update(aiConversations)
    .set({
      messages,
      title,
      model: model ?? conversation.model,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(aiConversations.id, conversationId));
};

export const setConversationArchived = async (
  userId: string,
  conversationId: string,
  isArchived: boolean
): Promise<void> => {
  const result = await db
    .update(aiConversations)
    .set({ isArchived, updatedAt: new Date() })
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
    .returning({ id: aiConversations.id });
  if (result.length === 0) throw new NotFoundError('Conversation');
};
