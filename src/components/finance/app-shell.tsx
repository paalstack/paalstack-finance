'use client';

import { type User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

import { signOutAction } from '@/lib/actions/auth-actions';
import { useFinanceStore } from '@/store/finance';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/assistant', label: 'Assistant' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/categories', label: 'Categories' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/loans', label: 'Loans & EMI' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings/family', label: 'Family' },
  { href: '/settings/billing', label: 'Billing' },
] as const;

type AppShellProps = {
  user: User;
  children: ReactNode;
};

export const AppShell = ({ user, children }: AppShellProps) => {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useFinanceStore();

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-card border-border flex h-full flex-col border-r transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-14'}`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-3">
          {sidebarOpen && (
            <span className="text-primary truncate text-sm font-bold tracking-tight">
              PaalStack Finance
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="text-muted-foreground hover:text-foreground hover:bg-muted ml-auto rounded p-1.5 transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sidebarOpen ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={!sidebarOpen ? label : undefined}
                className={`mb-0.5 flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="shrink-0 text-base leading-none">{active ? '▸' : '·'}</span>
                {sidebarOpen && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-border border-t px-3 py-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="bg-primary/20 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase">
              {user.email?.[0] ?? 'U'}
            </div>
            {sidebarOpen && (
              <span className="text-muted-foreground truncate text-xs">{user.email}</span>
            )}
          </div>
          <form action={signOutAction} className="mt-2">
            <button
              type="submit"
              title={!sidebarOpen ? 'Sign out' : undefined}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-xs font-medium transition-colors"
            >
              <span className="shrink-0 text-sm leading-none">⎋</span>
              {sidebarOpen && <span>Sign out</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
};
