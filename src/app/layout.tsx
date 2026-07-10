import { cn } from '@paalstack/react-ui/lib';
import { type Metadata, type Viewport } from 'next';
import { Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { type ReactNode } from 'react';

import { Providers } from '@/providers';

import '@/styles/globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | PaalStack Finance',
    default: 'PaalStack Finance',
  },
  description:
    'Personal finance tracker — manage accounts, track expenses, set budgets, and get AI insights.',
  keywords: ['finance', 'expense tracker', 'budget', 'money manager', 'personal finance'],
  authors: [{ name: 'Paalamugan' }],
  creator: 'PaalStack',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    title: 'PaalStack Finance',
    description: 'Personal finance tracker with AI insights',
    siteName: 'PaalStack Finance',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PaalStack Finance',
    description: 'Personal finance tracker with AI insights',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.variable, 'antialiased')}>
        <NextTopLoader showSpinner={false} height={3} color="var(--color-primary)" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
