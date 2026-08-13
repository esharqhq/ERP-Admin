import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { classifyAssignError } from "@/lib/tasks/assign-errors";

/**
 * Shaped like an axios error, which is what the call sites actually catch.
 *
 * `status()` and `getApiErrorCode()` in `lib/onboarding/errors.ts` both gate on
 * `err instanceof AxiosError`, so a plain `{ isAxiosError: true, response }` object
 * does not satisfy them — a real `AxiosError` instance with `.response` assigned is
 * required, matching the convention in `lib/onboarding/errors.test.ts`.
 */
function apiError(status: number, data: unknown): AxiosError {
  const e = new AxiosError("boom");
  // @ts-expect-error minimal shape is all the parser reads
  e.response = { status, data };
  return e;
}

describe("classifyAssignError", () => {
  it("reports a bare 403 as a permission problem", () => {
    // An empty 403 body is a missing grant, not a contract refusal.
    expect(classifyAssignError(apiError(403, ""))).toEqual({ kind: "permission" });
  });

  it("routes a cataloged code to the shared catalog with its labelKey", () => {
    const result = classifyAssignError(
      apiError(400, { error: "worker_contract_ends_before_task" }),
    );
    expect(result).toEqual({
      kind: "catalog",
      labelKey: "workerContractEndsBeforeTask",
    });
  });

  it.each([
    "worker_below_rating_floor",
    "worker_profession_not_eligible",
    "worker_limit_reached",
    "worker_has_overlapping_assignment",
  ])("routes %s to the page-local namespace", (code) => {
    expect(classifyAssignError(apiError(400, { error: code }))).toEqual({
      kind: "legacy",
      code,
    });
  });

  it("falls back to unknown for a code nothing owns copy for", () => {
    // worker_not_approved no longer exists (see the comment on
    // LEGACY_ASSIGN_ERRORS) — it is absent from both the shared catalog and this
    // module's legacy set, so it is a genuine example of a code nothing owns copy
    // for. worker_not_found does NOT work as this example: it IS in the shared
    // catalog (labelKey "subjectNotFound"), so it takes the "catalog" branch —
    // asserted below.
    expect(classifyAssignError(apiError(400, { error: "worker_not_approved" }))).toEqual({
      kind: "unknown",
    });
  });

  it("routes worker_not_found to the shared catalog, not unknown", () => {
    expect(classifyAssignError(apiError(400, { error: "worker_not_found" }))).toEqual({
      kind: "catalog",
      labelKey: "subjectNotFound",
    });
  });

  it("falls back to unknown for a body with no code at all", () => {
    expect(classifyAssignError(apiError(500, {}))).toEqual({ kind: "unknown" });
  });

  it("falls back to unknown for a non-API value", () => {
    expect(classifyAssignError(new Error("boom"))).toEqual({ kind: "unknown" });
  });
});
