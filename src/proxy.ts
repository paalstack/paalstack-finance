import { type NextRequest, NextResponse } from 'next/server';

import { createMiddlewareClient } from '@/lib/supabase/middleware';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'];
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/assistant',
  '/accounts',
  '/transactions',
  '/categories',
  '/budgets',
  '/loans',
  '/reports',
  '/settings',
  '/invite',
];

export const proxy = async (request: NextRequest) => {
  const { supabase, supabaseResponse } = createMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const next = request.nextUrl.searchParams.get('next') ?? '/dashboard';
    const url = request.nextUrl.clone();
    url.pathname = next;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
