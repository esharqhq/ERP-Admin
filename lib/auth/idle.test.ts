import { describe, expect, it } from "vitest";
import { IDLE_LIMIT_MS, idleExpired, shouldRecordActivity } from "@/lib/auth/idle";

const NOW = 1_800_000_000_000;

describe("idleExpired", () => {
  it("is one hour", () => {
    expect(IDLE_LIMIT_MS).toBe(60 * 60 * 1000);
  });

  it("keeps a session used within the hour", () => {
    expect(idleExpired(String(NOW - 59 * 60 * 1000), NOW)).toBe(false);
  });

  it("ends a session left alone for an hour", () => {
    expect(idleExpired(String(NOW - IDLE_LIMIT_MS), NOW)).toBe(true);
    expect(idleExpired(String(NOW - 3 * 24 * 60 * 60 * 1000), NOW)).toBe(true);
  });

  it("fails closed when the last activity is unknown", () => {
    // A session from before the timer existed, or storage someone edited.
    expect(idleExpired(null, NOW)).toBe(true);
    expect(idleExpired("", NOW)).toBe(true);
    expect(idleExpired("soon", NOW)).toBe(true);
  });
});

describe("shouldRecordActivity", () => {
  it("writes at most every 15 seconds, so a moving mouse is not a storage loop", () => {
    expect(shouldRecordActivity(String(NOW - 5_000), NOW)).toBe(false);
    expect(shouldRecordActivity(String(NOW - 15_000), NOW)).toBe(true);
    expect(shouldRecordActivity(null, NOW)).toBe(true);
  });
});
