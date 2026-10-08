import { signOut } from "@/lib/http/sign-out";
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
    wipeCredentials: () => {
      useAuthStore.getState().clearAuth();
      useAuthStore.persist.clearStorage();
    },
    dropCaches,
    detachPush: () => import("react-onesignal").then((m) => m.default.logout()),
    leave: (path) => window.location.replace(path),
  });
}
