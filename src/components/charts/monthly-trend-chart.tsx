'use client';

import { Box, TypographyMuted, type ChartConfig } from '@paalstack/react-ui';

import { ChartContainer } from '@/components/charts/chart-container';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from '@/components/charts/recharts';
import { formatCurrency } from '@/lib/utils/currency';
import { type MonthlyTrend } from '@/types';

type MonthlyTrendChartProps = {
  data: MonthlyTrend[];
  currency?: string;
  height?: number;
};

const MONTH_ABBR: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
};

const CHART_CONFIG: ChartConfig = {
  income: { label: 'Income', color: 'var(--chart-2)' },
  expenses: { label: 'Expenses', color: 'var(--chart-1)' },
};

const formatMonth = (monthKey: string) => {
  const parts = monthKey.split('-');
  const mm = parts[1] ?? '';
  return MONTH_ABBR[mm] ?? monthKey;
};

const formatAxisTick = (v: number) => {
  if (v === 0) return '0';
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type TooltipPayloadItem = {
  color?: string;
  name?: string | number;
  value?: number | string;
};

const MonthlyTrendTooltip = ({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  currency: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <Box className="border-border/50 bg-background grid min-w-32 gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      {payload.map((item) => (
        <Box key={String(item.name)} className="flex items-center gap-2">
          <Box
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          <Box className="flex flex-1 items-center justify-between gap-2">
            <TypographyMuted>{capitalize(String(item.name))}</TypographyMuted>
            <Box as="span" className="text-foreground font-mono font-medium tabular-nums">
              {formatCurrency(Number(item.value), { currency })}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const MonthlyTrendChartComponent = ({
  data,
  currency = 'INR',
  height = 280,
}: MonthlyTrendChartProps) => {
  if (data.length === 0) {
    return (
      <Box className="flex items-center justify-center rounded-lg" style={{ height }}>
        <TypographyMuted>No trend data</TypographyMuted>
      </Box>
    );
  }

  const chartData = data.map((d) => ({ ...d, name: formatMonth(d.month) }));

  return (
    <ChartContainer config={CHART_CONFIG} className="w-full" style={{ height }}>
      {({ width }) => (
        <BarChart
          width={width}
          height={height}
          data={chartData}
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatAxisTick}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<MonthlyTrendTooltip currency={currency} />} />
          <Bar dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} name="income" />
          <Bar
            dataKey="expenses"
            fill="var(--color-expenses)"
            radius={[3, 3, 0, 0]}
            name="expenses"
          />
        </BarChart>
      )}
    </ChartContainer>
  );
};

// Default export (instead of `mod.MonthlyTrendChart` in the `next/dynamic` loader) so
// Turbopack's chunk-preload tracking for this dynamically-imported, recharts-heavy module
// resolves reliably — see `./index.tsx`.
export default MonthlyTrendChartComponent;
export { MonthlyTrendChartComponent as MonthlyTrendChart };
