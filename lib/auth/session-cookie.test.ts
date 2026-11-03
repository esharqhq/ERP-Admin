import { describe, expect, it } from "vitest";
import { authCookie, expiredAuthCookie } from "@/lib/auth/session-cookie";

describe("authCookie", () => {
  it("lives 30 days when the admin asked to be remembered", () => {
    expect(authCookie({ remember: true, secure: true })).toBe(
      "auth-token=1; path=/; max-age=2592000; SameSite=Lax; Secure",
    );
  });

  it("is a session cookie otherwise, so closing the browser ends it", () => {
    const cookie = authCookie({ remember: false, secure: true });
    expect(cookie).not.toMatch(/max-age|expires/i);
    expect(cookie).toBe("auth-token=1; path=/; SameSite=Lax; Secure");
  });

  it("drops Secure on plain http, so local dev can sign in", () => {
    expect(authCookie({ remember: false, secure: false })).not.toMatch(/Secure/);
  });

  it("expires on sign-out", () => {
    expect(expiredAuthCookie).toBe("auth-token=; path=/; max-age=0");
  });
});
