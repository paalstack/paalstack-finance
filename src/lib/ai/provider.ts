import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { type LanguageModel } from 'ai';

import { env } from '@/lib/env';
import { ExternalServiceError } from '@/lib/utils/error';

/** NVIDIA NIM is OpenAI-compatible — same client, different base URL. */
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export const isAiEnabled = (): boolean => Boolean(env.AI_PROVIDER && env.AI_API_KEY);

const assertConfigured = (): { provider: NonNullable<typeof env.AI_PROVIDER>; apiKey: string } => {
  if (!env.AI_PROVIDER || !env.AI_API_KEY) {
    throw new ExternalServiceError(
      'AI',
      'AI provider is not configured. Set AI_PROVIDER and AI_API_KEY to enable the AI assistant.'
    );
  }
  return { provider: env.AI_PROVIDER, apiKey: env.AI_API_KEY };
};

/**
 * Resolves the configured chat model. Throws `ExternalServiceError` if no
 * provider is configured — callers should check `isAiEnabled()` first when
 * they want to degrade gracefully instead of surfacing an error.
 *
 * `openrouter` and `nvidia` are both OpenAI-compatible endpoints with
 * generous free-tier models (e.g. `openrouter/free`), so the same env vars
 * (`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`) work across all three providers.
 */
export const getAiModel = (): LanguageModel => {
  const { provider, apiKey } = assertConfigured();
  const model = env.AI_MODEL;

  switch (provider) {
    case 'openrouter': {
      const openrouter = createOpenRouter({ apiKey, baseURL: env.AI_BASE_URL });
      return openrouter.chat(model);
    }
    case 'nvidia': {
      const nvidia = createOpenAI({ apiKey, baseURL: env.AI_BASE_URL ?? NVIDIA_BASE_URL });
      return nvidia.chat(model);
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey, baseURL: env.AI_BASE_URL });
      return openai.chat(model);
    }
    default: {
      const unknownProvider: string = provider;
      throw new ExternalServiceError('AI', `Unsupported AI_PROVIDER: ${unknownProvider}`);
    }
  }
};
