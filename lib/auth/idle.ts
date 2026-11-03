/**
 * The panel's idle timeout: an hour without the admin touching it ends the
 * session (product owner, 2026-10-08).
 *
 * Without it a session never ended on its own. The routing cookie lived for
 * days, the refresh token lives 7 days and rotates on every use, so a browser
 * left open, or reopened, came back as the admin, data and all. It used to be
 * thrown out a few seconds later, but only by two refresh bugs (see
 * `lib/http/client.ts`), not by design.
 *
 * The last activity sits in localStorage, so every tab of the browser shares
 * one clock: work in one tab keeps the others alive, and an hour away ends all
 * of them. Background polling is not activity; only the admin's own input is.
 *
 * Enforced in three places:
 * - `SessionGate` checks before the dashboard renders anything, and watches
 *   input, focus and a timer while it is open;
 * - the HTTP client refuses to send a request once the hour is up, which
 *   covers a refetch that fires on wake before the gate's own check;
 * - `setTokens` starts the clock at login, and sign-out removes it.
 */
export const IDLE_LIMIT_MS = 60 * 60 * 1000;
export const LAST_ACTIVITY_KEY = "auth-last-activity";

/** Activity is written at most this often. Precision of the hour is this much. */
export const ACTIVITY_WRITE_EVERY_MS = 15_000;

function parse(value: string | null): number | null {
  if (!value) return null;
  const at = Number(value);
  return Number.isFinite(at) ? at : null;
}

/** Unknown counts as expired: a session that cannot show it is fresh is not. */
export function idleExpired(lastActivity: string | null, now: number): boolean {
  const at = parse(lastActivity);
  return at === null || now - at >= IDLE_LIMIT_MS;
}

export function shouldRecordActivity(lastActivity: string | null, now: number): boolean {
  const at = parse(lastActivity);
  return at === null || now - at >= ACTIVITY_WRITE_EVERY_MS;
}

// ── this browser ──────────────────────────────────────────────────────────────

export function readLastActivity(): string | null {
  try {
    return localStorage.getItem(LAST_ACTIVITY_KEY);
  } catch {
    return null;
  }
}

export function recordActivity(now: number = Date.now()): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {
    // storage blocked: the gate then reads "unknown" and signs out, failing closed
  }
}

export function forgetActivity(): void {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // nothing to forget
  }
}

/** True when this browser's session has been idle past the limit. */
export function idleExpiredHere(now: number = Date.now()): boolean {
  return idleExpired(readLastActivity(), now);
}
