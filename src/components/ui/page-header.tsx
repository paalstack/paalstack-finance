import { Box, HStack, TypographyH1, TypographyMuted } from '@paalstack/react-ui';
import { type ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <Box as="header" className="border-border flex items-center justify-between border-b px-6 py-4">
    <Box>
      <TypographyH1 className="text-lg font-semibold">{title}</TypographyH1>
      {description && <TypographyMuted className="text-sm">{description}</TypographyMuted>}
    </Box>
    {actions && <HStack className="gap-2">{actions}</HStack>}
  </Box>
);
