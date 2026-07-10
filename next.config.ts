import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

// Same host PostHog is initialized with in `lib/analytics/posthog-provider.tsx`.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const posthogAssetsHost = posthogHost.replace(/^https:\/\/(us|eu)\.i\.posthog\.com$/, 'https://$1-assets.i.posthog.com');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  transpilePackages: ['@paalstack/react-ui', '@paalstack/react-hooks', '@paalstack/react-icons'],

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  headers: async () => [
    {
      source: '/:path*',
      headers: SECURITY_HEADERS,
    },
  ],

  // Reverse-proxies PostHog ingest through this app's own origin (see
  // `lib/analytics/posthog-provider.tsx`) so ad blockers don't drop analytics
  // requests. `skipTrailingSlashRedirect` is required by PostHog's Next.js
  // proxy guide for the rewrite to apply correctly.
  skipTrailingSlashRedirect: true,
  rewrites: async () => [
    { source: '/ingest/static/:path*', destination: `${posthogAssetsHost}/static/:path*` },
    { source: '/ingest/:path*', destination: `${posthogHost}/:path*` },
  ],
};

// Wrapping is safe even without a Sentry project configured — source map
// upload / tunneling only activate when SENTRY_ORG/SENTRY_PROJECT are set
// (i.e. in CI), and `authToken` being undefined just skips the upload step.
const configWithSentry = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: !process.env.CI,
  widenClientFileUpload: true,

  // Proxies Sentry ingest requests through the app's own origin so ad
  // blockers / corporate proxies don't drop error reports.
  tunnelRoute: '/monitoring',

  disableLogger: true,
  automaticVercelMonitors: true,
});

// `ANALYZE=true pnpm build` opens an interactive treemap of the client/server
// bundles — outermost wrapper so it can inspect the final webpack config,
// including whatever Sentry's plugin adds. No-op (zero overhead) otherwise.
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(configWithSentry);
