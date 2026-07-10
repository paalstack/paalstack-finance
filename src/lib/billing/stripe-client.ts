import Stripe from 'stripe';

import { env } from '@/lib/env';
import { ExternalServiceError } from '@/lib/utils/error';

export const isBillingEnabled = (): boolean => Boolean(env.STRIPE_SECRET_KEY);

let client: Stripe | null = null;

/**
 * Lazily-created Stripe client, pinned to the SDK's bundled API version
 * (omitting `apiVersion` defaults to it). Throws `ExternalServiceError` if
 * `STRIPE_SECRET_KEY` isn't set — callers on user-facing paths should check
 * `isBillingEnabled()` first to degrade gracefully instead.
 */
export const getStripeClient = (): Stripe => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ExternalServiceError(
      'Stripe',
      'Billing is not configured. Set STRIPE_SECRET_KEY to enable it.'
    );
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
};
