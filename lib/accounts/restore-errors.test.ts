import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { restoreErrorKey } from "@/lib/accounts/restore-errors";

function apiError(status: number, data: unknown): AxiosError {
  const err = new AxiosError("failed");
  // @ts-expect-error — a minimal response is all the reader touches.
  err.response = { status, data };
  return err;
}

describe("restoreErrorKey", () => {
  it("keeps the email and phone clashes apart", () => {
    // ⚠ They are separate codes on purpose: the phone can clash independently
    // of the email, and naming the wrong one sends the admin to check the wrong
    // thing.
    expect(restoreErrorKey(apiError(409, { error: "cannot_restore_email_taken" })).key)
      .toBe("emailTaken");
    expect(restoreErrorKey(apiError(409, { error: "cannot_restore_phone_taken" })).key)
      .toBe("phoneTaken");
  });

  it("reads both the worker and the owner spelling of the same refusal", () => {
    expect(restoreErrorKey(apiError(409, { error: "worker_not_deleted" })).key).toBe("notDeleted");
    expect(restoreErrorKey(apiError(409, { error: "owner_not_deleted" })).key).toBe("notDeleted");
    expect(restoreErrorKey(apiError(404, { error: "worker_not_found" })).key).toBe("notFound");
    expect(restoreErrorKey(apiError(404, { error: "owner_not_found" })).key).toBe("notFound");
  });

  it("reads the mandatory reason", () => {
    expect(restoreErrorKey(apiError(400, { error: "reason_required" })).key)
      .toBe("reasonRequired");
  });

  it("falls back to the problem-details message when there is no error key", () => {
    // A [Required] failure is refused by model binding before the action runs.
    const err = apiError(400, { errors: { Reason: ["The Reason field is required."] } });
    expect(restoreErrorKey(err)).toEqual({
      key: "generic",
      detail: "The Reason field is required.",
    });
  });

  it("does not invent a key for a code it has never seen", () => {
    expect(restoreErrorKey(apiError(409, { error: "something_new" })).key).toBe("generic");
  });
});
