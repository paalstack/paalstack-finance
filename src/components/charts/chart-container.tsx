'use client';

import { type ChartConfig } from '@paalstack/react-ui';
import { cn } from '@paalstack/react-ui/lib';
import { useEffect, useId, useState, type ComponentProps, type ReactNode } from 'react';

/**
 * Lightweight chart wrapper that injects CSS variables from `config`.
 *
 * Avoids recharts' `ResponsiveContainer` — under Turbopack that export (and
 * other barrel exports) can resolve to `undefined`, which crashes with:
 * "Element type is invalid … Check the render method of `ChartContainer`".
 *
 * Children may be a render prop that receives the measured container size.
 */
type ChartSize = { width: number; height: number };

type ChartContainerProps = Omit<ComponentProps<'div'>, 'children'> & {
  config: ChartConfig;
  children: ReactNode | ((size: ChartSize) => ReactNode);
};

const THEMES = { light: '', dark: '.dark' } as const;

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, item]) => item.theme ?? item.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join('\n')}
}
`
          )
          .join('\n'),
      }}
    />
  );
};

const FALLBACK_SIZE: ChartSize = { width: 320, height: 200 };

const renderChildren = (
  children: ChartContainerProps['children'],
  size: ChartSize,
  ready: boolean
): ReactNode => {
  if (typeof children !== 'function') return children;
  if (!ready) return null;
  return children(size.width > 0 ? size : FALLBACK_SIZE);
};

export const ChartContainer = ({
  id,
  config,
  className,
  children,
  ...props
}: ChartContainerProps) => {
  const uniqueId = useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerEl) return;

    const update = () => {
      const { width, height } = containerEl.getBoundingClientRect();
      setSize({
        width: Math.max(Math.floor(width), containerEl.clientWidth),
        height: Math.max(Math.floor(height), containerEl.clientHeight),
      });
      setReady(true);
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [containerEl]);

  return (
    <div
      ref={setContainerEl}
      data-slot="chart"
      data-chart={chartId}
      className={cn(
        '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border flex w-full justify-center text-xs [&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke="#fff"]]:stroke-transparent [&_.recharts-surface]:outline-hidden',
        className
      )}
      {...props}
    >
      <ChartStyle id={chartId} config={config} />
      {renderChildren(children, size, ready)}
    </div>
  );
};
