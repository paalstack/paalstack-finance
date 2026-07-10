import { Card, TypographyLarge, TypographyMuted, TypographySmall } from '@paalstack/react-ui';

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  valueClassName?: string;
};

export const StatCard = ({ label, value, hint, className, valueClassName }: StatCardProps) => (
  <Card contentClassName="gap-1.5" className={className}>
    <TypographySmall className="text-muted-foreground font-medium tracking-wide uppercase">
      {label}
    </TypographySmall>
    <TypographyLarge
      className={`font-bold tabular-nums${valueClassName ? ` ${valueClassName}` : ''}`}
    >
      {value}
    </TypographyLarge>
    {hint && <TypographyMuted className="text-xs">{hint}</TypographyMuted>}
  </Card>
);
