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
