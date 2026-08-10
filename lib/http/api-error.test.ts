import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import {
  getApiErrorCode,
  getValidationMessage,
  looksLikeLeakedMessage,
} from "@/lib/http/api-error";

function axiosErr(status: number, data: unknown): AxiosError {
  const e = new AxiosError("boom");
  // @ts-expect-error minimal shape is all the parser reads
  e.response = { status, data };
  return e;
}

describe("getApiErrorCode", () => {
  it("reads the project envelope", () => {
    expect(getApiErrorCode(axiosErr(400, { error: "incomplete_document_set" })))
      .toBe("incomplete_document_set");
  });

  it("returns null for problem-details, which carries no error field", () => {
    expect(
      getApiErrorCode(
        axiosErr(400, { title: "One or more validation errors occurred.", status: 400, errors: {} }),
      ),
    ).toBeNull();
  });
});

describe("getValidationMessage", () => {
  it("pulls the first field message out of problem-details", () => {
    const msg = getValidationMessage(
      axiosErr(400, {
        title: "One or more validation errors occurred.",
        status: 400,
        errors: { Reason: ["The Reason field is required."] },
      }),
    );
    expect(msg).toBe("The Reason field is required.");
  });

  it("returns null for the project envelope", () => {
    expect(getValidationMessage(axiosErr(400, { error: "code_exists" }))).toBeNull();
  });

  it("survives an empty or malformed errors bag", () => {
    expect(getValidationMessage(axiosErr(400, { errors: {} }))).toBeNull();
    expect(getValidationMessage(axiosErr(400, { errors: { A: [] } }))).toBeNull();
    expect(getValidationMessage(axiosErr(400, { errors: "nope" }))).toBeNull();
  });

  it("rejects a whitespace-only field message", () => {
    expect(getValidationMessage(axiosErr(400, { errors: { A: ["   "] } }))).toBeNull();
  });
});

describe("looksLikeLeakedMessage", () => {
  it("accepts real snake_case codes", () => {
    expect(looksLikeLeakedMessage("incomplete_document_set")).toBe(false);
    expect(looksLikeLeakedMessage("invalid_contract_period")).toBe(false);
    expect(looksLikeLeakedMessage("forbidden")).toBe(false);
  });

  it("flags a leaked library sentence", () => {
    // Shipped for real on GET /api/admin/owners, measured 2026-08-08.
    expect(
      looksLikeLeakedMessage(
        "Cannot write DateTime with Kind=Unspecified to PostgreSQL type 'timestamp with time zone'",
      ),
    ).toBe(true);
  });

  it("flags anything with spaces or capitals", () => {
    expect(looksLikeLeakedMessage("Value cannot be null.")).toBe(true);
    expect(looksLikeLeakedMessage("SomeEnumName")).toBe(true);
  });
});
