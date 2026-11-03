import { signOut } from "@/lib/http/sign-out";
import { forgetActivity } from "@/lib/auth/idle";
import { useAuthStore } from "@/store/auth.store";

/**
 * `signOut` wired to this browser. Shared by the Log out item (`useLogout`)
 * and the HTTP client's failed refresh, so an expired session is torn down
 * exactly like a deliberate logout.
 *
 * The push SDK is imported lazily: `client.ts` is part of every service, and
 * `react-onesignal` has no business in that import graph.
 */
export function signOutHere(locale: string, dropCaches: () => void = () => {}): Promise<void> {
  return signOut(locale, {
    wipeCredentials: discardStaleSession,
    dropCaches,
    detachPush: () => import("react-onesignal").then((m) => m.default.logout()),
    leave: (path) => window.location.replace(path),
  });
}

/**
 * Drop the tokens from the store and from storage, and expire the cookie.
 *
 * Also run by the login page when it mounts. `proxy.ts` only lets a browser
 * without the `auth-token` cookie reach that page, so any tokens still in
 * storage there belong to a session that already ended: most often a
 * "don't remember me" session cookie the browser dropped on close
 * (`lib/auth/session-cookie.ts`).
 */
export function discardStaleSession(): void {
  useAuthStore.getState().clearAuth();
  useAuthStore.persist.clearStorage();
  forgetActivity();
}
