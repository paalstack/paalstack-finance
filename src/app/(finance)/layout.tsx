import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';

import { AppShell } from '@/components/finance/app-shell';
import { requireAuth } from '@/lib/auth';

type FinanceLayoutProps = {
  children: ReactNode;
};

const FinanceLayout = async ({ children }: FinanceLayoutProps) => {
  const { user, error } = await requireAuth();

  if (error || !user) {
    return redirect('/login');
  }

  return <AppShell user={user}>{children}</AppShell>;
};

export default FinanceLayout;
