'use client';

import dynamic from 'next/dynamic';

import { ChartSkeleton } from './chart-skeleton';

import type { MonthlyTrendChart as MonthlyTrendChartType } from './monthly-trend-chart';
import type { SpendingByCategoryChart as SpendingByCategoryChartType } from './spending-by-category-chart';
import type { ComponentProps } from 'react';

/**
 * `recharts` is one of the heaviest client dependencies in the bundle —
 * these are only used on the dashboard and reports pages, so code-split them
 * out of the shared chunk instead of shipping the charting library to every
 * route. `ssr: false` because `recharts` measures the DOM for layout and
 * renders nothing meaningful server-side anyway.
 */
export const MonthlyTrendChart = dynamic<ComponentProps<typeof MonthlyTrendChartType>>(
  () => import('./monthly-trend-chart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const SpendingByCategoryChart = dynamic<ComponentProps<typeof SpendingByCategoryChartType>>(
  () => import('./spending-by-category-chart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export { ChartSkeleton };
