import { Center } from '@paalstack/react-ui';

import { LoadingState } from '@/components/ui';

const FinanceLoading = () => (
  <Center className="h-full flex-1">
    <LoadingState label="Loading..." />
  </Center>
);

export default FinanceLoading;
