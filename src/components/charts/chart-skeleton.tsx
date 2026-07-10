import { Box } from '@paalstack/react-ui';

/** Loading fallback while a chart's `recharts` chunk streams in — see `next/dynamic` usage in `index.ts`. */
export const ChartSkeleton = ({ height = 280 }: { height?: number }) => (
  <Box className="bg-muted/50 w-full animate-pulse rounded-lg" style={{ height }} />
);
