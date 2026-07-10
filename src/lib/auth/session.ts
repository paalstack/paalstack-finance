import { type User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const ensureProfile = async (supabase: SupabaseServerClient, user: User) => {
  try {
    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      },
      { onConflict: 'id' }
    );

    return error;
  } catch (cause) {
    return cause instanceof Error ? cause : new Error('Unknown error syncing profile');
  }
};

/**
 * Resolve the current session and ensure a profiles row exists.
 * Use in Server Actions and Route Handlers — never in Client Components.
 *
 * Profile sync is best-effort: a failure there (e.g. a transient DB error)
 * must never be treated as "unauthenticated", otherwise a valid session gets
 * bounced to /login, which the middleware immediately redirects back to the
 * protected page it came from — an infinite redirect loop.
 *
 * @example
 * const { supabase, user, error } = await requireAuth()
 * if (error) return NextResponse.json({ error }, { status: 401 })
 */
export const requireAuth = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: 'Unauthorized' as const };
  }

  const profileError = await ensureProfile(supabase, user);
  if (profileError) {
    logger.error(`[requireAuth] Failed to sync profile: ${profileError.message}`);
  }

  return { supabase, user, error: null };
};

/**
 * Lightweight variant of `requireAuth` for read paths that don't need the
 * profiles row to exist (skips the upsert round-trip).
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};
