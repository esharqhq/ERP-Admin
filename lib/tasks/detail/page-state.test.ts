import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { classifyGroupLoad } from "@/lib/tasks/detail/page-state";

function apiError(status: number, data: unknown): AxiosError {
  const err = new AxiosError("failed");
  // @ts-expect-error — a minimal response is all the reader touches.
  err.response = { status, data };
  return err;
}

describe("classifyGroupLoad — spec §7 (permission, then 404, then generic)", () => {
  it("an empty-bodied 403 is permissions", () => {
    expect(classifyGroupLoad(apiError(403, ""))).toBe("forbidden");
  });
  it("404 is not found", () => {
    expect(classifyGroupLoad(apiError(404, ""))).toBe("notFound");
  });
  it("5xx and network failures are generic", () => {
    expect(classifyGroupLoad(apiError(500, ""))).toBe("error");
    expect(classifyGroupLoad(new Error("Network Error"))).toBe("error");
  });
});
