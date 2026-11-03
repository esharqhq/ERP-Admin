/**
 * The `auth-token` cookie `proxy.ts` routes on. It is a hint, not a credential:
 * the tokens live in `localStorage["auth-storage"]`.
 *
 * "Stay signed in after closing the browser" (once "Keep me signed in for 30
 * days") used to be decoration. The form never read
 * it, and the cookie lived 7 days whichever way it was set, so an admin who
 * left it unticked on a shared computer stayed signed in after closing the
 * browser. Now:
 * - ticked: the cookie lives `REMEMBER_DAYS`;
 * - unticked: a session cookie, which the browser drops when it closes. The
 *   next visit is sent to the login page, and that page wipes the tokens left
 *   in storage (`discardStaleSession`).
 *
 * Either way an hour without activity ends the session (`lib/auth/idle.ts`),
 * which is why the label promises no number of days: ticked only means closing
 * the browser does not end it.
 */
export const AUTH_COOKIE = "auth-token";
export const REMEMBER_DAYS = 30;

export function authCookie({ remember, secure }: { remember: boolean; secure: boolean }): string {
  const parts = [`${AUTH_COOKIE}=1`, "path=/"];
  if (remember) parts.push(`max-age=${60 * 60 * 24 * REMEMBER_DAYS}`);
  parts.push("SameSite=Lax");
  // Secure on https only, so `next dev` on http://localhost still logs in.
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export const expiredAuthCookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
