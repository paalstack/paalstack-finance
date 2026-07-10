import { Empty } from '@paalstack/react-ui';
import { type ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({ title, description, icon, action, className }: EmptyStateProps) => (
  <Empty
    className={className}
    media={icon}
    mediaVariant={icon ? 'icon' : undefined}
    title={title}
    description={description}
    content={action}
  />
);
