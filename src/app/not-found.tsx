import { Button, ErrorNotFoundResponse } from '@paalstack/react-ui';
import Link from 'next/link';

const NotFoundPage = () => (
  <ErrorNotFoundResponse heading="Page not found" subHeading="This page does not exist.">
    <Button asChild>
      <Link href="/dashboard">Go to dashboard</Link>
    </Button>
  </ErrorNotFoundResponse>
);

export default NotFoundPage;
