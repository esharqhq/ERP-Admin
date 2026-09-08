import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { agencyErrorKey } from "@/lib/agencies/errors";

/**
 * ⚠ A **real** `AxiosError`, not a plain object with `isAxiosError: true`.
 * `getApiErrorCode` narrows with `err instanceof AxiosError`
 * (`lib/http/api-error.ts:11`), so a duck-typed fixture would test the fallback
 * path on every case and every assertion would pass for the wrong reason.
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

describe("agencyErrorKey", () => {
  it("names the blocking agency rather than claiming the email is registered", () => {
    expect(agencyErrorKey(apiError({ error: "agency_email_taken" })).key).toBe(
      "emailTaken",
    );
  });

  it("maps a stale country lookup", () => {
    expect(agencyErrorKey(apiError({ error: "country_not_found" })).key).toBe(
      "countryNotFound",
    );
  });

  it("maps a stale city lookup", () => {
    expect(agencyErrorKey(apiError({ error: "city_not_found" })).key).toBe(
      "cityNotFound",
    );
  });

  it("maps a city that is not in the chosen country", () => {
    expect(agencyErrorKey(apiError({ error: "city_country_mismatch" })).key).toBe(
      "cityCountryMismatch",
    );
  });

  it("maps a reversed contract window", () => {
    expect(agencyErrorKey(apiError({ error: "invalid_contract_window" })).key).toBe(
      "invalidContractWindow",
    );
  });

  /** ⚠ A server setup fault. The message must not blame the operator's input. */
  it("maps an unseeded AGENCY role as a server fault", () => {
    expect(agencyErrorKey(apiError({ error: "agency_role_missing" })).key).toBe(
      "roleMissing",
    );
  });

  it("maps a vanished agency", () => {
    expect(
      agencyErrorKey(apiError({ error: "not_found", detail: "x" }, 404)).key,
    ).toBe("notFound");
  });

  /**
   * ⚠ `[Required]` failures are refused by ASP.NET **before** the action runs, so
   * they carry no `error` field at all. `getValidationMessage` digs the first
   * sentence out of the `errors` bag — without it the admin who left a box empty
   * is told "unknown error".
   */
  it("passes the server's own field message through for problem-details", () => {
    const result = agencyErrorKey(
      apiError({
        title: "One or more validation errors occurred.",
        status: 400,
        errors: { LegalName: ["The LegalName field is required."] },
      }),
    );
    expect(result.key).toBe("generic");
    expect(result.detail).toBe("The LegalName field is required.");
  });

  /**
   * ⚠ `G_ArgumentExceptionMessageLeaksIntoErrorField`: nine controller sites put
   * `ex.Message` straight into `error`, so the field can hold prose whose wording
   * changes on a library upgrade. Every real code in this API is lower snake_case,
   * so the shape tells them apart — and a leaked sentence must not reach an admin
   * dressed as a diagnosis.
   */
  it("does not surface a leaked exception message as a diagnosis", () => {
    const result = agencyErrorKey(
      apiError({ error: "Value cannot be null. (Parameter 'cityId')" }),
    );
    expect(result.key).toBe("generic");
    expect(result.detail).toBeUndefined();
  });

  it("falls back to generic for a code this build does not recognise", () => {
    expect(agencyErrorKey(apiError({ error: "something_new" })).key).toBe("generic");
  });

  it("falls back to generic for a non-API failure", () => {
    expect(agencyErrorKey(new Error("network down")).key).toBe("generic");
  });
});
