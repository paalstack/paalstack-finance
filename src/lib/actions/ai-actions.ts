'use server';

import { revalidatePath } from 'next/cache';

import { setConversationArchived } from '@/lib/ai';
import { requireAuth } from '@/lib/auth/session';
import { logger } from '@/lib/utils/logger';
import { type ActionResult } from '@/types';

export const archiveConversationAction = async (conversationId: string): Promise<ActionResult> => {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) return { success: false, error: 'Unauthorized' };

    await setConversationArchived(user.id, conversationId, true);
    revalidatePath('/assistant');
    return { success: true, data: undefined };
  } catch (cause) {
    logger.error('[archiveConversationAction]', { error: cause });
    return { success: false, error: 'Failed to archive conversation' };
  }
};
