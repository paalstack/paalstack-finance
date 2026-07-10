import { Resend } from 'resend';

import { env } from '@/lib/env';
import { ExternalServiceError } from '@/lib/utils/error';

export type FamilyInviteEmailPayload = {
  to: string;
  familyName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
};

const assertConfigured = (): { apiKey: string; from: string } => {
  if (!env.RESEND_API_KEY) {
    throw new ExternalServiceError(
      'Resend',
      'Email delivery is not configured. Set RESEND_API_KEY to enable invite emails.'
    );
  }
  return { apiKey: env.RESEND_API_KEY, from: env.RESEND_FROM_EMAIL };
};

export const isEmailEnabled = (): boolean => Boolean(env.RESEND_API_KEY);

const buildInviteHtml = ({
  familyName,
  inviterName,
  role,
  acceptUrl,
  expiresAt,
}: Omit<FamilyInviteEmailPayload, 'to'>): string => {
  const expiry = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Family Invitation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 16px; color: #0f172a; }
    .card { background: #ffffff; border-radius: 12px; max-width: 480px; margin: 0 auto; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .logo { font-weight: 700; font-size: 18px; color: #6366f1; margin-bottom: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
    p { color: #475569; line-height: 1.6; margin: 0 0 16px; }
    .role-badge { display: inline-block; background: #f1f5f9; border-radius: 6px; padding: 3px 10px; font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 24px; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .expiry { margin-top: 24px; font-size: 13px; color: #94a3b8; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 28px 0; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">PaalStack Finance</div>
    <h1>You're invited to join ${familyName}</h1>
    <p><strong>${inviterName}</strong> has invited you to collaborate on family finances.</p>
    <div class="role-badge">Role: ${role.charAt(0).toUpperCase() + role.slice(1)}</div>
    <p>Click the button below to accept the invitation and start tracking finances together.</p>
    <a href="${acceptUrl}" class="btn">Accept invitation</a>
    <p class="expiry">This invitation expires on ${expiry}.</p>
    <hr class="divider" />
    <div class="footer">If you weren't expecting this invitation, you can safely ignore this email.</div>
  </div>
</body>
</html>`;
};

const buildInviteText = ({
  familyName,
  inviterName,
  role,
  acceptUrl,
  expiresAt,
}: Omit<FamilyInviteEmailPayload, 'to'>): string => {
  const expiry = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `You're invited to join ${familyName} on PaalStack Finance

${inviterName} has invited you to collaborate on family finances as a ${role}.

Accept the invitation: ${acceptUrl}

This invitation expires on ${expiry}.

If you weren't expecting this invitation, you can safely ignore this email.`;
};

export const sendFamilyInviteEmail = async (payload: FamilyInviteEmailPayload): Promise<void> => {
  const { apiKey, from } = assertConfigured();
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: `You're invited to join ${payload.familyName} on PaalStack Finance`,
    html: buildInviteHtml(payload),
    text: buildInviteText(payload),
  });

  if (error) {
    throw new ExternalServiceError('Resend', error.message);
  }
};
