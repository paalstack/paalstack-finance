import { type NextRequest, NextResponse } from 'next/server';

import { getStripeClient, handleStripeWebhookEvent, isBillingEnabled } from '@/lib/billing';
import { env } from '@/lib/env';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * `docs/API_CONTRACT.md` §13.5 — server-to-server Stripe webhook. Verified
 * via the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET`, never
 * via a Supabase session (Stripe has no user session to send).
 *
 * Reads the raw body via `request.text()` — signature verification fails on
 * a re-serialized/parsed body, so this must run before any `request.json()`.
 */
export const POST = async (request: NextRequest) => {
  if (!isBillingEnabled() || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const stripe = getStripeClient();
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    await handleStripeWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error('[webhooks/billing] Signature verification or handling failed', {
      error: err instanceof Error ? err.message : err,
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
};
