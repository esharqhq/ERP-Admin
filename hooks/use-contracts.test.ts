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

  it("invalidates the owner contract list, the kyc queue, notifications, and the profile detail query", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    invalidateAfterTerminate(qc, "owner", "owner-1");

    const keys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(["owner-contracts"]);
    expect(keys).toContainEqual(["kyc"]);
    expect(keys).toContainEqual(["notifications"]);
    expect(keys).toContainEqual(["kyc", "profile", "owner-1"]);
  });

  it("skips the subject detail invalidation when no subject id is given, without throwing", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    invalidateAfterTerminate(qc, "worker", undefined);

    expect(spy).toHaveBeenCalledTimes(3);
    const keys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(["worker-contracts"]);
    expect(keys).toContainEqual(["workers"]);
    expect(keys).toContainEqual(["notifications"]);
  });
});
