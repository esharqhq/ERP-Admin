import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { describeApiError } from "@/lib/onboarding/errors";

function axiosErr(status: number, data: unknown): AxiosError {
  const e = new AxiosError("boom");
  // @ts-expect-error minimal shape is all the parser reads
  e.response = { status, data };
  return e;
}

describe("describeApiError — problem-details validation", () => {
  it("resolves to the validation code with the field message as detail", () => {
    const info = describeApiError(
      axiosErr(400, {
        title: "One or more validation errors occurred.",
        status: 400,
        errors: { Reason: ["The Reason field is required."] },
      }),
    );
    expect(info).toEqual({
      code: "validation",
      labelKey: "validation",
      reaction: "toast",
      detail: "The Reason field is required.",
    });
  });

  it("still returns null when there is neither a code nor a validation message", () => {
    expect(describeApiError(axiosErr(400, { title: "opaque failure" }))).toBeNull();
  });
});

describe("describeApiError — interpolated code", () => {
  it("splits the worker-side invalid_document_type shape into code + detail", () => {
    const info = describeApiError(axiosErr(400, { error: "invalid_document_type: Nonsense" }));
    expect(info).toEqual({
      code: "invalid_document_type",
      labelKey: "invalidDocumentType",
      reaction: "toast",
      detail: "Nonsense",
    });
  });

  it("resolves the bare code with no detail on the KYC side", () => {
    const info = describeApiError(axiosErr(400, { error: "invalid_document_type" }));
    expect(info).toEqual({
      code: "invalid_document_type",
      labelKey: "invalidDocumentType",
      reaction: "toast",
    });
  });
});

describe("describeApiError — leaked library message", () => {
  it("does not let a leaked sentence pass split + catalog lookup as a real code", () => {
    const info = describeApiError(
      axiosErr(400, {
        error: "Cannot write DateTime with Kind=Unspecified to PostgreSQL type 'timestamp with time zone'",
      }),
    );
    expect(info).toEqual({ code: "unknown", labelKey: "unknown", reaction: "toast" });
  });
});
