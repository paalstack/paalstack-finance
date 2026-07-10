import { type NextRequest } from 'next/server';
import { z } from 'zod';

import { getConversation, setConversationArchived, toUIMessage } from '@/lib/ai';
import { apiError, apiSuccess } from '@/lib/api';
import { requireAuth } from '@/lib/auth/session';
import { UnauthorizedError, ValidationError } from '@/lib/utils/error';

const archiveBodySchema = z.object({ isArchived: z.boolean() });

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) throw new UnauthorizedError();

    const { id } = await params;
    const conversation = await getConversation(user.id, id);

    return apiSuccess({
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      isArchived: conversation.isArchived,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map((message, index) =>
        toUIMessage(message, `${conversation.id}-${index}`)
      ),
    });
  } catch (err) {
    return apiError(err);
  }
};

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) throw new UnauthorizedError();

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = archiveBodySchema.safeParse(body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.issues);

    await setConversationArchived(user.id, id, parsed.data.isArchived);
    return apiSuccess({ id, isArchived: parsed.data.isArchived });
  } catch (err) {
    return apiError(err);
  }
};
