import { z } from 'zod';

/**
 * Deliberately loose — full `UIMessage` validation is the AI SDK's job
 * (`convertToModelMessages` throws on malformed parts). This just guards the
 * shape our route handler actually reads before handing off to the SDK.
 */
export const uiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(z.record(z.string(), z.unknown())),
  metadata: z.unknown().optional(),
});

export const aiChatRequestSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  familyId: z.string().uuid().optional(),
  messages: z.array(uiMessageSchema).min(1).max(200),
});

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
  familyId: z.string().uuid().optional(),
});

export const conversationListQuerySchema = z.object({
  familyId: z.string().uuid().optional(),
  isArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type AiChatRequestInput = z.infer<typeof aiChatRequestSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
