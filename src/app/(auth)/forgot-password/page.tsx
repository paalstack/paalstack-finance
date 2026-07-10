import { Box, Text, TypographyH2, TypographyMuted, VStack } from '@paalstack/react-ui';
import { type Metadata } from 'next';
import Link from 'next/link';

import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset Password',
};

const ForgotPasswordPage = () => {
  return (
    <VStack className="gap-6">
      <Box className="text-center">
        <TypographyH2 className="text-xl font-semibold">Forgot password?</TypographyH2>
        <TypographyMuted className="mt-1 text-sm">
          Enter your email and we will send a reset link.
        </TypographyMuted>
      </Box>
      <ForgotPasswordForm />
      <Text className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-primary underline underline-offset-4">
          Back to sign in
        </Link>
      </Text>
    </VStack>
  );
};

export default ForgotPasswordPage;
