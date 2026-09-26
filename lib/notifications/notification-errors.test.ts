import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { isAlreadyGone } from "@/lib/notifications/notification-errors";

function httpError(status: number): AxiosError {
  return new AxiosError("x", "ERR", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: "",
  });
}

describe("isAlreadyGone", () => {
  // §11.5 — a foreign or missing id both answer a bodyless 404.
  it("reads a 404 as the row already being gone", () => {
    expect(isAlreadyGone(httpError(404))).toBe(true);
  });

  it("does not swallow any other failure", () => {
    expect(isAlreadyGone(httpError(403))).toBe(false);
    expect(isAlreadyGone(httpError(500))).toBe(false);
    expect(isAlreadyGone(new AxiosError("Network Error"))).toBe(false);
    expect(isAlreadyGone(new Error("boom"))).toBe(false);
  });
});
