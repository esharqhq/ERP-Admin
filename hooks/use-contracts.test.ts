import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { invalidateAfterTerminate } from "@/hooks/use-contracts";

/**
 * `useTerminateContract`'s invalidation list, exercised directly against a real
 * `QueryClient` — no component render, no jsdom. This is the exact bug the final
 * whole-plan review found: the worker side never invalidated `["worker", id]`,
 * the singular-keyed detail query `hooks/use-worker-detail.ts` reads, so the
 * worker Docs detail screen stayed stale after a terminate until reload. The
 * owner side happened to work because its detail key (`["kyc", "profile", id]`)
 * nests under the invalidated `["kyc"]` prefix — a coincidence, not a guarantee.
 */
describe("invalidateAfterTerminate", () => {
  it("invalidates the worker contract list, the worker queue, notifications, and the Docs detail query", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    invalidateAfterTerminate(qc, "worker", "worker-1");

    const keys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(["worker-contracts"]);
    expect(keys).toContainEqual(["workers"]);
    expect(keys).toContainEqual(["notifications"]);
    // This is the row the bug shipped without.
    expect(keys).toContainEqual(["worker", "worker-1"]);
  });

  /**
   * A second, real bug shipped after the one above was fixed: the owner Docs
   * detail page passed `ownerUserId` here instead of the KYC profile id
   * `useKycProfile` actually keys its query on, so this step silently built a
   * key nothing was ever cached under — invisible in the running app because
   * the `["kyc"]` prefix invalidation above happened to refresh the same
   * query anyway. `ownerProfileId` and `ownerUserId` are deliberately given
   * different, realistic-looking values below (not near-identical strings) so
   * a call site that passes the wrong one produces a key this test does not
   * expect, and the `.not` assertion catches it even if `toContainEqual`
   * above it were loosened or removed.
   */
  it("invalidates the owner profile detail query keyed on the profile id, not the user id", () => {
    const ownerProfileId = "profile-owner-abc";
    const ownerUserId = "user-owner-xyz";
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    invalidateAfterTerminate(qc, "owner", ownerProfileId);

    const keys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(["owner-contracts"]);
    expect(keys).toContainEqual(["kyc"]);
    expect(keys).toContainEqual(["notifications"]);
    expect(keys).toContainEqual(["kyc", "profile", ownerProfileId]);
    expect(keys).not.toContainEqual(["kyc", "profile", ownerUserId]);
  });

  it("skips the subject detail invalidation when the caller has no subject id to give, without throwing", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    // Required, not optional — "" is how a caller with no mounted
    // subject-detail query (the legacy registry page) opts out explicitly,
    // rather than a forgetful caller omitting the argument by accident.
    invalidateAfterTerminate(qc, "worker", "");

    expect(spy).toHaveBeenCalledTimes(3);
    const keys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(["worker-contracts"]);
    expect(keys).toContainEqual(["workers"]);
    expect(keys).toContainEqual(["notifications"]);
  });
});
