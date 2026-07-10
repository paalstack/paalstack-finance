import { Box, TypographyH2, TypographyMuted, VStack } from '@paalstack/react-ui';
import { type Metadata } from 'next';

import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = {
  title: 'Set New Password',
};

const ResetPasswordPage = () => {
  return (
    <VStack className="gap-6">
      <Box className="text-center">
        <TypographyH2 className="text-xl font-semibold">Set a new password</TypographyH2>
        <TypographyMuted className="mt-1 text-sm">
          Choose a new password for your account.
        </TypographyMuted>
      </Box>
      <ResetPasswordForm />
    </VStack>
  );
};

export default ResetPasswordPage;
