import { type NextRequest } from 'next/server';

import { createConversation, listConversations } from '@/lib/ai';
import { apiError, apiSuccess } from '@/lib/api';
import { requireAuth } from '@/lib/auth/session';
import { UnauthorizedError, ValidationError } from '@/lib/utils/error';
import { createConversationSchema, conversationListQuerySchema } from '@/lib/validations/ai';

export const GET = async (request: NextRequest) => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) throw new UnauthorizedError();

    const searchParams = request.nextUrl.searchParams;
    const parsed = conversationListQuerySchema.safeParse({
      familyId: searchParams.get('familyId') ?? undefined,
      isArchived: searchParams.get('isArchived') ?? undefined,
    });
    if (!parsed.success) throw new ValidationError('Invalid query', parsed.error.issues);

    const conversations = await listConversations(user.id, parsed.data);
    return apiSuccess(conversations);
  } catch (err) {
    return apiError(err);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) throw new UnauthorizedError();

    const body: unknown = await request.json().catch(() => ({}));
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.issues);

    const id = await createConversation(user.id, parsed.data);
    return apiSuccess({ id, title: parsed.data.title ?? null, messages: [] }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
};
