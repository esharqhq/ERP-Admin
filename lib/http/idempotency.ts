/**
 * Routes marked `[Idempotent]` replay the cached 201 for 24 h when the same key
 * arrives twice, so the key must stay **the same across retries of one intent**.
 * That is the whole point: a retried request must not author a second row.
 *
 * The caller supplies it. Generating it inside the request helper would give
 * every retry a fresh key, turning a retried create into a duplicate — exactly
 * what the header exists to prevent.
 */
export function idempotent(key: string) {
  return { headers: { "X-Idempotency-Key": key } };
}

/**
 * Mint one key per user-initiated attempt and hold it (a ref, not state) for as
 * long as that attempt may be retried. Do not call it per request.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/** A held key, tagged with the intent it was minted for. */
export interface HeldKey {
  scope: string;
  key: string;
}

/**
 * For a door one component can fire at **different intents** — a per-row action
 * on a list, a value that can be set to X and then to Y. `scope` names the intent
 * (the row's id, the body being written): the same scope keeps its key across
 * retries, and a different scope mints a fresh one, because a held key would
 * replay the *previous* intent's cached 2xx instead of performing this one.
 *
 * The caller still releases it (`ref.current = null`) on success — otherwise a
 * later return to an earlier scope (switch on, off, on again) would replay.
 */
export function holdKey(ref: { current: HeldKey | null }, scope: string): string {
  if (ref.current?.scope !== scope) {
    ref.current = { scope, key: newIdempotencyKey() };
  }
  return ref.current.key;
}
