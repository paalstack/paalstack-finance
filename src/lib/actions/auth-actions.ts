'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { captureServerEvent } from '@/lib/analytics/posthog-server';
import { ensureProfile } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { AUTH_RATE_LIMITS, checkRateLimit, formatRetryAfter } from '@/lib/utils/rate-limit';
import {
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type SignupInput,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from '@/lib/validations/auth';

export type AuthActionResult = { error: string } | undefined;

/**
 * Best-effort client IP for rate-limit keying. Trusts `x-forwarded-for` from
 * the platform's edge/proxy (Vercel and most hosts set this); falls back to
 * a shared bucket when absent (e.g. local dev without a proxy) rather than
 * failing open with no limiting.
 */
const getClientIp = async (): Promise<string> => {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  return headerList.get('x-real-ip') ?? 'unknown';
};

const rateLimitOrError = async (
  action: keyof typeof AUTH_RATE_LIMITS
): Promise<AuthActionResult> => {
  const ip = await getClientIp();
  const { limit, windowMs } = AUTH_RATE_LIMITS[action];
  const result = checkRateLimit(`${action}:${ip}`, limit, windowMs);

  if (!result.allowed) {
    logger.warn(`[auth] Rate limit hit for ${action}`, { ip });
    return { error: `Too many attempts. Try again in ${formatRetryAfter(result.retryAfterMs)}.` };
  }

  return undefined;
};

export const signInAction = async (input: LoginInput): Promise<AuthActionResult> => {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid email or password' };

  const limited = await rateLimitOrError('login');
  if (limited) return limited;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  if (data.user) {
    const profileError = await ensureProfile(supabase, data.user);
    if (profileError)
      logger.error(`[signInAction] Failed to sync profile: ${profileError.message}`);
    captureServerEvent(data.user.id, 'login_completed', { userId: data.user.id });
  }

  revalidatePath('/', 'layout');
  return undefined;
};

export const signUpAction = async (input: SignupInput): Promise<AuthActionResult> => {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const limited = await rateLimitOrError('signup');
  if (limited) return limited;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  if (data.user) {
    captureServerEvent(data.user.id, 'signup_completed', { userId: data.user.id });
  }

  revalidatePath('/', 'layout');
  return undefined;
};

export const forgotPasswordAction = async (
  input: ForgotPasswordInput
): Promise<AuthActionResult> => {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid email address' };

  const limited = await rateLimitOrError('forgotPassword');
  if (limited) return limited;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  });

  // Always report success to the caller regardless of whether the email
  // exists — surfacing `error` here would let an attacker enumerate
  // registered accounts. Genuine delivery failures are still logged.
  if (error) logger.error(`[forgotPasswordAction] ${error.message}`);

  return undefined;
};

export const resetPasswordAction = async (input: ResetPasswordInput): Promise<AuthActionResult> => {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const limited = await rateLimitOrError('resetPassword');
  if (limited) return limited;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return undefined;
};

export const signOutAction = async (): Promise<void> => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
};
