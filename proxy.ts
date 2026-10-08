import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { buildCsp } from '@/lib/http/csp';

const locales = ['en', 'de'] as const;
const defaultLocale = 'en';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

/**
 * A fresh nonce and the policy that names it (see `lib/http/csp.ts`).
 *
 * The policy goes on the *request* as well, because that is where Next reads
 * the nonce to stamp it on its own script tags. Without the request copy every
 * page would render with scripts the response header then blocks.
 *
 * `CSP_REPORT_ONLY=1` is a runtime switch like `MAINTENANCE_MODE`: if the policy
 * blocks something in production, an operator can turn it into reports
 * without a rebuild while the policy is fixed.
 */
function withCsp(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = buildCsp({
    nonce,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    healthUrl: process.env.HEALTH_URL,
    dev: process.env.NODE_ENV === 'development',
  });
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', policy);
  return {
    request: new NextRequest(request, { headers }),
    headers,
    stamp<T extends Response>(response: T): T {
      const name =
        process.env.CSP_REPORT_ONLY === '1'
          ? 'Content-Security-Policy-Report-Only'
          : 'Content-Security-Policy';
      response.headers.set(name, policy);
      return response;
    },
  };
}

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

  const csp = withCsp(request);

  // Maintenance is checked BEFORE auth on purpose: during an upgrade the login
  // form cannot succeed, so bouncing an unauthenticated operator to it would
  // hide the reason. Rewrite rather than redirect so the URL they typed stays
  // put, and answer 503 so uptime monitors and crawlers read it correctly
  // instead of caching an outage as a healthy 200.
  if (process.env.MAINTENANCE_MODE === '1' && !isMaintenance) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/maintenance`;
    return csp.stamp(
      NextResponse.rewrite(url, { status: 503, request: { headers: csp.headers } }),
    );
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

  // Otherwise hand off to next-intl for locale routing. It copies the request's
  // headers onto its rewrite, so the nonce travels with it.
  return csp.stamp(intlMiddleware(csp.request));
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
