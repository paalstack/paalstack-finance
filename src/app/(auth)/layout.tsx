import { Box, Center, TypographyH1, TypographyMuted } from '@paalstack/react-ui';
import { type ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <Center className="from-background to-muted/30 min-h-screen bg-gradient-to-br px-4 py-12">
      <Box className="w-full max-w-sm">
        <Box className="mb-8 text-center">
          <TypographyH1 className="text-2xl font-bold tracking-tight">
            PaalStack Finance
          </TypographyH1>
          <TypographyMuted className="mt-1 text-sm">Take control of your money</TypographyMuted>
        </Box>
        {children}
      </Box>
    </Center>
  );
};

export default AuthLayout;
