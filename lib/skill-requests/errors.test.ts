import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { skillRequestErrorKey } from "@/lib/skill-requests/errors";

/**
 * ⚠ A **real** `AxiosError`. `getApiErrorCode` narrows with
 * `err instanceof AxiosError` (`lib/http/api-error.ts:11`), so a duck-typed
 * fixture takes the fallback path on every case and every assertion passes for
 * the wrong reason.
 */
function apiError(data: unknown, status = 400): AxiosError {
  const err = new AxiosError("request failed");
  err.response = {
    data,
    status,
    statusText: "",
    headers: {},
    config: {} as never,
  };
  return err;
}

/** This feature's envelope: a single `error` key, and never a `detail`. */
function envelope(code: string): AxiosError {
  return apiError({ error: code });
}

describe("skillRequestErrorKey", () => {
  it("maps every documented code to its own key", () => {
    expect(skillRequestErrorKey(envelope("note_required"))).toBe("noteRequired");
    expect(skillRequestErrorKey(envelope("reason_required"))).toBe("reasonRequired");
    expect(skillRequestErrorKey(envelope("skill_request_not_found"))).toBe("notFound");
    expect(skillRequestErrorKey(envelope("profession_already_held"))).toBe(
      "alreadyHeld",
    );
    expect(skillRequestErrorKey(envelope("cannot_revoke_general"))).toBe(
      "cannotRevokeGeneral",
    );
    expect(skillRequestErrorKey(envelope("cannot_revoke_last_skill"))).toBe(
      "cannotRevokeLastSkill",
    );
  });

  /**
   * The two codes whose copy must not read as a permanent failure. They are
   * asserted by name because their wording is the whole point of mapping them:
   * one is temporary and retryable, the other means a colleague got there first.
   */
  it("gives the temporary and raced refusals their own keys", () => {
    expect(skillRequestErrorKey(envelope("skill_in_use_by_live_work"))).toBe(
      "inUseByLiveWork",
    );
    expect(skillRequestErrorKey(envelope("skill_request_invalid_state"))).toBe(
      "invalidState",
    );
  });

  /**
   * An omitted required field is refused by ASP.NET **before** the handler runs,
   * so it arrives as problem-details with no `error` field at all. Falling through
   * to "unknown" there would tell an admin who left the box empty nothing.
   */
  it("falls back to the validation key when the body is problem-details", () => {
    const err = apiError({ errors: { Note: ["The Note field is required."] } });
    expect(skillRequestErrorKey(err)).toBe("validation");
  });

  it("falls back to unknown for a code it has never met", () => {
    expect(skillRequestErrorKey(envelope("something_new"))).toBe("unknown");
    expect(skillRequestErrorKey(new Error("network"))).toBe("unknown");
  });
});
