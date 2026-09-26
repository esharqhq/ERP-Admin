import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { auditErrorKey } from "@/lib/audit/errors";

function axiosErr(status: number, data: unknown): AxiosError {
  const e = new AxiosError("boom");
  // @ts-expect-error minimal shape is all the parser reads
  e.response = { status, data };
  return e;
}

describe("auditErrorKey", () => {
  it("reads a problem-details 400 — an action name the enum binder refused", () => {
    expect(
      auditErrorKey(
        axiosErr(400, {
          title: "One or more validation errors occurred.",
          status: 400,
          errors: { action: ["The value 'KYC_APPROVED' is not valid."] },
        }),
      ),
    ).toBe("validation");
  });

  it("reads an empty 403 as a missing permission", () => {
    expect(auditErrorKey(axiosErr(403, ""))).toBe("forbidden");
    expect(auditErrorKey(axiosErr(403, undefined))).toBe("forbidden");
  });

  it("reads the auth middleware's {error: forbidden} 403 as a missing permission too", () => {
    expect(auditErrorKey(axiosErr(403, { error: "forbidden" }))).toBe("forbidden");
  });

  it("does not guess at an {error} code this route never documented", () => {
    expect(auditErrorKey(axiosErr(400, { error: "something_new" }))).toBe("unknown");
  });

  it("falls back to generic for anything else", () => {
    expect(auditErrorKey(axiosErr(500, ""))).toBe("unknown");
    expect(auditErrorKey(new Error("network"))).toBe("unknown");
    expect(auditErrorKey(null)).toBe("unknown");
  });
});
