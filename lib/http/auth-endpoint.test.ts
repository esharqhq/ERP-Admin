import { describe, expect, it } from "vitest";
import { isSessionMintingEndpoint } from "@/lib/http/auth-endpoint";

describe("isSessionMintingEndpoint", () => {
  it("matches the login url the auth service actually sends", () => {
    // Exactly the string from authService.login — the query string is the whole
    // reason a bare equality check was not enough.
    expect(isSessionMintingEndpoint("/api/Auth/login?userType=Admin")).toBe(true);
  });

  it("matches refresh, and matches whether the url is relative or absolute", () => {
    expect(isSessionMintingEndpoint("/api/Auth/refresh")).toBe(true);
    expect(
      isSessionMintingEndpoint("https://api.uyer.app/api/Auth/login?userType=Admin"),
    ).toBe(true);
  });

  it("ignores casing and a trailing slash", () => {
    expect(isSessionMintingEndpoint("/api/auth/login")).toBe(true);
    expect(isSessionMintingEndpoint("/API/Auth/Login/")).toBe(true);
  });

  it("leaves every ordinary call to the refresh branch", () => {
    // These are the 401s that SHOULD still refresh and retry.
    expect(isSessionMintingEndpoint("/api/profile")).toBe(false);
    expect(isSessionMintingEndpoint("/api/admin/owners")).toBe(false);
    expect(isSessionMintingEndpoint("/api/profile/password")).toBe(false);
  });

  it("does not match a route that merely ends in the same words", () => {
    expect(isSessionMintingEndpoint("/api/admin/audit/login")).toBe(false);
    expect(isSessionMintingEndpoint("/api/Auth/login/history")).toBe(false);
  });

  it("survives a request with no url", () => {
    expect(isSessionMintingEndpoint(undefined)).toBe(false);
    expect(isSessionMintingEndpoint("")).toBe(false);
  });
});
