import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { eq } from 'drizzle-orm';
import { type NextRequest } from 'next/server';

import {
  createConversation,
  createFinanceTools,
  buildSystemPrompt,
  checkAiChatRateLimit,
  ensureConversation,
  getAiModel,
  isAiEnabled,
  syncConversationMessages,
} from '@/lib/ai';
import { apiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { env } from '@/lib/env';
import {
  ExternalServiceError,
  RateLimitedError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/utils/error';
import { logger } from '@/lib/utils/logger';
import { aiChatRequestSchema } from '@/lib/validations/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Streaming chat turn. Accepts the full `UIMessage[]` history from
 * `useChat`'s `DefaultChatTransport`, runs it through the finance tool set,
 * and streams a UI message stream response back. On completion, the full
 * (client + generated) message list is persisted to `ai_conversations`.
 */
export const POST = async (request: NextRequest) => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) throw new UnauthorizedError();

    if (!isAiEnabled()) {
      throw new ExternalServiceError('AI', 'AI is not configured');
    }

    const rateLimit = await checkAiChatRateLimit(user.id);
    if (!rateLimit.allowed) {
      throw new RateLimitedError(
        `Daily AI message limit reached. Try again in ${Math.ceil(rateLimit.retryAfterMs / (60 * 60 * 1000))}h, or upgrade your plan for a higher limit.`
      );
    }

    const body: unknown = await request.json();
    const parsed = aiChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid chat request', parsed.error.issues);
    }
    const { messages, familyId } = parsed.data;

    let { conversationId } = parsed.data;
    if (conversationId) {
      await ensureConversation(user.id, conversationId, { model: env.AI_MODEL, familyId });
    } else {
      conversationId = await createConversation(user.id, { model: env.AI_MODEL, familyId });
    }

    const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) });

    const modelMessages = await convertToModelMessages(messages as UIMessage[]);
    const tools = createFinanceTools(user.id);

    const result = streamText({
      model: getAiModel(),
      system: buildSystemPrompt({
        userName: profile?.fullName ?? null,
        currency: profile?.currency ?? 'INR',
        today: new Date().toISOString().slice(0, 10),
      }),
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
      onError: ({ error: streamError }) => {
        logger.error('[ai/chat] streamText error', { error: streamError });
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages as UIMessage[],
      onEnd: async ({ messages: finalMessages }) => {
        try {
          await syncConversationMessages(user.id, conversationId, finalMessages, env.AI_MODEL);
        } catch (persistError) {
          logger.error('[ai/chat] failed to persist conversation', { error: persistError });
        }
      },
      headers: { 'X-Conversation-Id': conversationId },
    });
  } catch (err) {
    return apiError(err);
  }
};
