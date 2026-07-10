'use client';

import { type ReactNode } from 'react';

import { PostHogProvider } from '@/lib/analytics/posthog-provider';

import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

type ProvidersProps = {
  children: ReactNode;
};

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <PostHogProvider>
      <ThemeProvider>
        <QueryProvider>{children}</QueryProvider>
      </ThemeProvider>
    </PostHogProvider>
  );
};
