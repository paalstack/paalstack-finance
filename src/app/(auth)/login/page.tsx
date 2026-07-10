import { Box, Text, TypographyH2, TypographyMuted, VStack } from '@paalstack/react-ui';
import { type Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign In',
};

const LoginPage = () => {
  return (
    <VStack className="gap-6">
      <Box className="text-center">
        <TypographyH2 className="text-xl font-semibold">Welcome back</TypographyH2>
        <TypographyMuted className="mt-1 text-sm">Sign in to your account</TypographyMuted>
      </Box>
      <LoginForm />
      <Text className="text-muted-foreground text-center text-sm">
        No account?{' '}
        <Link href="/signup" className="text-primary underline underline-offset-4">
          Sign up
        </Link>
      </Text>
    </VStack>
  );
};

export default LoginPage;
