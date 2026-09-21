/**
 * True when a request is one of the auth calls that *mints* a session, rather
 * than one that spends an existing one.
 *
 * The response interceptor in `client.ts` reads a 401 as "this session expired,
 * go refresh it". For `/api/Auth/login` a 401 means the opposite — the
 * credentials just offered were wrong — and there is no session to refresh. Sent
 * down the refresh branch it finds no refresh token, throws, and ends at
 * `window.location.href`, whose reload discards the React Query error the login
 * form was about to render: a mistyped password blanked the form and explained
 * nothing (measured against api.uyer.app, 2026-09-21).
 *
 * `/api/Auth/refresh` is listed for the same reason even though the refresh call
 * is made with a bare `axios.post` today and so bypasses the interceptor — a 401
 * from it must never be answered by refreshing again, and that must stay true if
 * it is ever moved onto `apiClient`.
 *
 * Matched on the path only: `login` carries `?userType=Admin`, and `baseURL` may
 * be an absolute origin or empty, so the url reaching here is sometimes relative
 * and sometimes whole. Case-insensitive because the routes are spelled `Auth` in
 * the services but ASP.NET routing does not care.
 */
export function isSessionMintingEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
  return path.endsWith("/api/auth/login") || path.endsWith("/api/auth/refresh");
}
