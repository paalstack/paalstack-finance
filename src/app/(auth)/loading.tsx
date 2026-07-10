import { Center } from '@paalstack/react-ui';

import { LoadingState } from '@/components/ui';

const AuthLoading = () => (
  <Center className="min-h-screen">
    <LoadingState label="Loading..." />
  </Center>
);

export default AuthLoading;
