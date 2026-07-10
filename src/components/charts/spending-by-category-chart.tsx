'use client';

import { Box, TypographyMuted, type ChartConfig } from '@paalstack/react-ui';

import { ChartContainer } from '@/components/charts/chart-container';
import { Cell, Pie, PieChart, Tooltip } from '@/components/charts/recharts';
import { formatCurrency } from '@/lib/utils/currency';
import { type SpendingByCategory } from '@/types';

type SpendingByCategoryChartProps = {
  data: SpendingByCategory[];
  currency?: string;
  height?: number;
};

const DEFAULT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

type TooltipPayloadItem = {
  name?: string | number;
  value?: number | string;
  payload?: { fill?: string };
};

const SpendingTooltip = ({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  currency: string;
}) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  if (!item) return null;

  return (
    <Box className="border-border/50 bg-background grid min-w-32 gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <Box className="flex items-center gap-2">
        <Box
          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: item.payload?.fill }}
        />
        <Box className="flex flex-1 items-center justify-between gap-2">
          <TypographyMuted>{item.name}</TypographyMuted>
          <Box as="span" className="text-foreground font-mono font-medium tabular-nums">
            {formatCurrency(Number(item.value), { currency })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const SpendingByCategoryChartComponent = ({
  data,
  currency = 'INR',
  height = 280,
}: SpendingByCategoryChartProps) => {
  if (data.length === 0) {
    return (
      <Box className="flex items-center justify-center rounded-lg" style={{ height }}>
        <TypographyMuted>No spending data</TypographyMuted>
      </Box>
    );
  }

  const chartConfig = data.reduce<ChartConfig>((config, entry, index) => {
    config[entry.categoryName] = {
      label: entry.categoryName,
      color: entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    };
    return config;
  }, {});

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      {({ width }) => (
        <PieChart width={width} height={height}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="amount"
            nameKey="categoryName"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.categoryId}
                fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<SpendingTooltip currency={currency} />} />
        </PieChart>
      )}
    </ChartContainer>
  );
};

// Default export (instead of `mod.SpendingByCategoryChart` in the `next/dynamic` loader) so
// Turbopack's chunk-preload tracking for this dynamically-imported, recharts-heavy module
// resolves reliably — see `./index.tsx`.
export default SpendingByCategoryChartComponent;
export { SpendingByCategoryChartComponent as SpendingByCategoryChart };
