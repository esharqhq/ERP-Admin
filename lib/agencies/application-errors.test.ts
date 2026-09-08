import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { applicationErrorKey } from "@/lib/agencies/application-errors";

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

describe("applicationErrorKey", () => {
  it("maps a lost race with a colleague", () => {
    expect(
      applicationErrorKey(apiError({ error: "application_already_reviewed" })).key,
    ).toBe("alreadyReviewed");
  });

  it("maps a missing note and a missing reason to different keys", () => {
    expect(applicationErrorKey(apiError({ error: "note_required" })).key).toBe(
      "noteRequired",
    );
    expect(applicationErrorKey(apiError({ error: "reason_required" })).key).toBe(
      "reasonRequired",
    );
  });

  it("maps a reversed contract window on approve", () => {
    expect(
      applicationErrorKey(apiError({ error: "invalid_contract_window" })).key,
    ).toBe("invalidContractWindow");
  });

  it("maps a row with no location as unbuildable", () => {
    expect(
      applicationErrorKey(apiError({ error: "application_location_missing" })).key,
    ).toBe("locationMissing");
  });

  /** ⚠ A server setup fault. The copy must not blame the operator's input. */
  it("maps an unseeded AGENCY role as a server fault", () => {
    expect(applicationErrorKey(apiError({ error: "agency_role_missing" })).key).toBe(
      "roleMissing",
    );
  });

  it("maps a 404 from the detail route", () => {
    expect(
      applicationErrorKey(
        apiError({ error: "application_not_found", detail: "x" }, 404),
      ).key,
    ).toBe("notFound");
  });

  /**
   * ⚠ The refusal that needs a screen rather than a sentence: it names the live
   * agency blocking the approve, and since 2026-09-08 only a live one can, so the
   * id always resolves and the UI links it.
   */
  it("carries the blocking agency out of an approve email clash", () => {
    const result = applicationErrorKey(
      apiError({
        error: "agency_email_taken",
        detail: "An agency login already exists for this email address.",
        existingAgencyId: "b8e6856f",
        existingAgencyLegalName: "Nordwind Personal GmbH",
      }),
    );
    expect(result.key).toBe("emailTaken");
    expect(result.blocking).toEqual({
      id: "b8e6856f",
      legalName: "Nordwind Personal GmbH",
    });
  });

  it("maps the email clash without blocking keys, defensively", () => {
    const result = applicationErrorKey(apiError({ error: "agency_email_taken" }));
    expect(result.key).toBe("emailTaken");
    expect(result.blocking).toBeUndefined();
  });

  it("maps every document-door refusal to its own key", () => {
    const pairs: [string, string][] = [
      ["invalid_or_expired_token", "invalidToken"],
      ["storage_key_mismatch", "storageKeyMismatch"],
      ["unsupported_document_type", "unsupportedType"],
      ["file_not_found", "fileNotFound"],
      ["declared_mime_mismatch", "mimeMismatch"],
      ["document_too_large", "tooLarge"],
      ["document_limit_reached", "limitReached"],
    ];
    for (const [code, key] of pairs) {
      expect(applicationErrorKey(apiError({ error: code })).key).toBe(key);
    }
  });

  it("maps the intake door's unconfigured terms", () => {
    expect(
      applicationErrorKey(apiError({ error: "terms_not_configured" })).key,
    ).toBe("termsNotConfigured");
  });

  it("passes the server's own field message through for problem-details", () => {
    const result = applicationErrorKey(
      apiError({
        title: "One or more validation errors occurred.",
        status: 400,
        errors: { Text: ["The Text field is required."] },
      }),
    );
    expect(result.key).toBe("generic");
    expect(result.detail).toBe("The Text field is required.");
  });

  /**
   * ⚠ `G_ArgumentExceptionMessageLeaksIntoErrorField`: nine controller sites put
   * `ex.Message` into `error`. A leaked sentence must not reach an admin dressed
   * as a diagnosis.
   */
  it("does not surface an unrecognised error field as a detail", () => {
    const result = applicationErrorKey(
      apiError({ error: "Value cannot be null. (Parameter 'text')" }),
    );
    expect(result.key).toBe("generic");
    expect(result.detail).toBeUndefined();
  });

  it("falls back to generic for a non-API failure", () => {
    expect(applicationErrorKey(new Error("network down")).key).toBe("generic");
  });
});
