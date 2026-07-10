import { Box, Text, TypographyH2, TypographyMuted, VStack } from '@paalstack/react-ui';
import { type Metadata } from 'next';
import Link from 'next/link';

import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Create Account',
};

const SignupPage = () => {
  return (
    <VStack className="gap-6">
      <Box className="text-center">
        <TypographyH2 className="text-xl font-semibold">Create an account</TypographyH2>
        <TypographyMuted className="mt-1 text-sm">Start tracking your finances</TypographyMuted>
      </Box>
      <SignupForm />
      <Text className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-primary underline underline-offset-4">
          Sign in
        </Link>
      </Text>
    </VStack>
  );
};

export default SignupPage;
