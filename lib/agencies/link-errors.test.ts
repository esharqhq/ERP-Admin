import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { linkErrorKey } from "@/lib/agencies/link-errors";

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

describe("linkErrorKey", () => {
  it("maps every documented code to its own key", () => {
    const pairs: [string, string][] = [
      ["agency_link_not_found", "notFound"],
      ["worker_not_found", "workerNotFound"],
      ["agency_not_found", "agencyNotFound"],
      ["agency_not_in_force", "agencyNotInForce"],
      ["agency_link_exists", "linkExists"],
      ["agency_link_not_awaiting_you", "notAwaitingYou"],
      ["agency_link_already_resolved", "alreadyResolved"],
      ["reason_required", "reasonRequired"],
      ["invalid_sort_column", "invalidSortColumn"],
    ];
    for (const [code, key] of pairs) {
      expect(linkErrorKey(apiError({ error: code })).key).toBe(key);
    }
  });

  /**
   * ⚠ The refusal that is really an instruction: it means *this worker already
   * has a live link — reject that one first*, which is the two-act rule (reject,
   * then attach) surfacing as an error rather than as a button.
   */
  it("maps the live-link clash on attach", () => {
    expect(linkErrorKey(apiError({ error: "agency_link_exists" })).key).toBe(
      "linkExists",
    );
  });

  it("maps a 404 from the route id", () => {
    expect(
      linkErrorKey(apiError({ error: "agency_link_not_found", detail: "x" }, 404))
        .key,
    ).toBe("notFound");
  });

  /**
   * ⚠ **The reason doors answer in two different shapes.** Confirm and reject
   * answer `{"error": "reason_required"}`; the ATTACH door returns
   * problem-details instead, because `[Required]` trims a whitespace-only value
   * away before the service is reached. Both must produce a usable sentence, and
   * only the first has a code.
   */
  it("passes the server's own field message through for problem-details", () => {
    const result = linkErrorKey(
      apiError({
        title: "One or more validation errors occurred.",
        status: 400,
        errors: { Reason: ["The Reason field is required."] },
      }),
    );
    expect(result.key).toBe("generic");
    expect(result.detail).toBe("The Reason field is required.");
  });

  /**
   * ⚠ Nine controller sites put `ex.Message` into `error`
   * (`G_ArgumentExceptionMessageLeaksIntoErrorField`). Library prose dressed as
   * a diagnosis must not reach an admin, and must **not** become a `detail`.
   */
  it("does not surface an unrecognised error field as a detail", () => {
    const result = linkErrorKey(
      apiError({ error: "Value cannot be null. (Parameter 'reason')" }),
    );
    expect(result.key).toBe("generic");
    expect(result.detail).toBeUndefined();
  });

  it("falls back to generic for a non-API failure", () => {
    expect(linkErrorKey(new Error("network down")).key).toBe("generic");
  });
});
