import { routing } from "@/i18n/routing";

/**
 * The order a sign-out runs in, kept apart from React so it has a test.
 *
 * Logging out used to delete only the `auth-token` cookie. That cookie is a
 * routing hint for `proxy.ts`, not a credential: the access token (24h) and the
 * rotating refresh token (7 days) stayed in `localStorage["auth-storage"]`, so
 * anyone at the same browser could read them, or set the cookie again by hand
 * and be back in the panel as the previous admin. The backend has no logout
 * route to revoke the refresh token (`IRefreshTokenStore.RevokeAsync` exists but
 * no controller exposes it, as of origin/main 42894b56), so wiping the client
 * copy is the whole of what the panel can do, and it has to happen first.
 *
 * Each step runs even when an earlier one throws. Staying on the dashboard
 * after "Log out" is the worst outcome, because the admin walks away believing
 * the session ended.
 */
export interface SignOutSteps {
  /** Drop the tokens from the store and from storage, and expire the cookie. */
  wipeCredentials: () => void;
  /** Drop cached server data, which is not keyed per admin. */
  dropCaches: () => void;
  /**
   * Unlink this browser's push subscription from the admin (`OneSignal.logout`).
   * The provider only lives inside the dashboard, and the full page load below
   * unmounts it before it can do that itself, so without this step the old
   * admin's notifications keep arriving here.
   */
  detachPush?: () => Promise<void>;
  /**
   * Navigate to the login page. A full page load, so no in-memory state
   * survives: not the query cache, not the zustand store, and no SignalR socket
   * still authenticated as the old admin.
   */
  leave: (loginPath: string) => void;
}

/**
 * How long to wait for the push SDK. An SDK that never initialised (no app id,
 * blocked script) queues the call and never answers.
 */
export const PUSH_DETACH_TIMEOUT_MS = 1500;

export async function signOut(locale: string, steps: SignOutSteps): Promise<void> {
  try {
    steps.wipeCredentials();
  } catch {
    // keep going: leaving matters more than a clean wipe
  }
  try {
    steps.dropCaches();
  } catch {
    // keep going
  }
  if (steps.detachPush) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      steps.detachPush().catch(() => {}),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, PUSH_DETACH_TIMEOUT_MS);
      }),
    ]);
    clearTimeout(timer);
  }
  steps.leave(`/${locale}/login`);
}

/** The locale prefix of a panel path, or the default locale when there is none. */
export function localeFromPath(pathname: string): string {
  const first = pathname.split("/")[1] ?? "";
  return (routing.locales as readonly string[]).includes(first)
    ? first
    : routing.defaultLocale;
}
