'use client';

import { ErrorInternalServer } from '@paalstack/react-ui';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { logger } from '@/lib/utils/logger';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

/**
 * Isolates a client subtree so a render/runtime crash inside it (e.g. a
 * chart widget) doesn't take down the whole page. Wrap independently
 * failable sections, not the entire app — use `error.tsx` for route-level
 * failures instead.
 *
 * Implemented as a plain class component (rather than `@paalstack/react-ui`'s
 * `ErrorBoundary`) to avoid that component's `FallbackComponent` generic
 * clashing with `react-error-boundary`'s own prop typing.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('Client error boundary caught an error', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <ErrorInternalServer
          error={error}
          statusCode={500}
          onRefresh={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
