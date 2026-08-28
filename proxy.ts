import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'de'] as const;
const defaultLocale = 'en';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // First path segment is the locale (localePrefix: 'always')
  const seg = pathname.split('/');
  const hasLocale = (locales as readonly string[]).includes(seg[1]);
  const locale = hasLocale ? seg[1] : defaultLocale;
  const path = hasLocale ? `/${seg.slice(2).join('/')}` : pathname;

  const isAuthed = request.cookies.has('auth-token');
  const isLogin = path === '/login';
  const isMaintenance = path === '/maintenance';

  // Maintenance is checked BEFORE auth on purpose: during an upgrade the login
  // form cannot succeed, so bouncing an unauthenticated operator to it would
  // hide the reason. Rewrite rather than redirect so the URL they typed stays
  // put, and answer 503 so uptime monitors and crawlers read it correctly
  // instead of caching an outage as a healthy 200.
  if (process.env.MAINTENANCE_MODE === '1' && !isMaintenance) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/maintenance`;
    return NextResponse.rewrite(url, { status: 503 });
  }

  // Unauthenticated users may only see the login page
  if (!isAuthed && !isLogin && !isMaintenance) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  // Authenticated users shouldn't see the login page
  if (isAuthed && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Otherwise hand off to next-intl for locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
