import { Loading } from '@paalstack/react-ui';

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export const LoadingState = ({ label = 'Loading...', className }: LoadingStateProps) => (
  <Loading content={label} className={className} />
);
