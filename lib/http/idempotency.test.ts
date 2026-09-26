import { describe, expect, it } from "vitest";
import { holdKey, idempotent, type HeldKey } from "@/lib/http/idempotency";

/**
 * `holdKey` is what lets one component hold keys for a door it can fire at
 * different intents — a per-row deactivate, a setting set to X and then to Y.
 */
describe("holdKey", () => {
  it("keeps the same key across retries of one scope", () => {
    const ref: { current: HeldKey | null } = { current: null };
    const first = holdKey(ref, "admin-1");
    expect(holdKey(ref, "admin-1")).toBe(first);
  });

  it("mints a fresh key when the scope changes, so another target never replays", () => {
    const ref: { current: HeldKey | null } = { current: null };
    const a = holdKey(ref, "admin-1");
    const b = holdKey(ref, "admin-2");
    expect(b).not.toBe(a);
    // Back to the first target is a new intent too — its old key is gone.
    expect(holdKey(ref, "admin-1")).not.toBe(a);
  });

  it("mints a fresh key after the caller releases it on success", () => {
    const ref: { current: HeldKey | null } = { current: null };
    const first = holdKey(ref, "k=true");
    ref.current = null;
    expect(holdKey(ref, "k=true")).not.toBe(first);
  });
});

describe("idempotent", () => {
  it("sends the key it is given, unchanged", () => {
    expect(idempotent("abc")).toEqual({ headers: { "X-Idempotency-Key": "abc" } });
  });
});
