import { afterEach, describe, expect, it, vi } from "vitest";
import { localeFromPath, signOut } from "@/lib/http/sign-out";

function steps() {
  const calls: string[] = [];
  return {
    calls,
    wipeCredentials: vi.fn(() => {
      calls.push("wipe");
    }),
    dropCaches: vi.fn(() => {
      calls.push("drop");
    }),
    detachPush: vi.fn(async () => {
      calls.push("push");
    }),
    leave: vi.fn((path: string) => {
      calls.push(`leave ${path}`);
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("signOut", () => {
  it("wipes the credentials before anything else, then leaves for the locale's login", async () => {
    const s = steps();
    await signOut("de", s);
    expect(s.calls).toEqual(["wipe", "drop", "push", "leave /de/login"]);
  });

  it("still leaves when dropping the caches throws — the tokens are already gone", async () => {
    const s = steps();
    s.dropCaches.mockImplementation(() => {
      throw new Error("cache");
    });
    await signOut("en", s);
    expect(s.wipeCredentials).toHaveBeenCalledOnce();
    expect(s.leave).toHaveBeenCalledWith("/en/login");
  });

  it("still drops the caches and leaves when the wipe throws", async () => {
    // Staying on the dashboard after "Log out" is the worst outcome: the admin
    // walks away believing the session ended.
    const s = steps();
    s.wipeCredentials.mockImplementation(() => {
      throw new Error("storage");
    });
    await signOut("en", s);
    expect(s.dropCaches).toHaveBeenCalledOnce();
    expect(s.leave).toHaveBeenCalledWith("/en/login");
  });

  it("detaches push before leaving, so this browser stops getting the old admin's notifications", async () => {
    const s = steps();
    await signOut("en", s);
    expect(s.calls.indexOf("push")).toBeLessThan(s.calls.indexOf("leave /en/login"));
  });

  it("does not wait on push forever — an SDK that never initialised never answers", async () => {
    vi.useFakeTimers();
    const s = steps();
    s.detachPush.mockImplementation(() => new Promise<void>(() => {}));
    const done = signOut("en", s);
    expect(s.leave).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    await done;
    expect(s.leave).toHaveBeenCalledWith("/en/login");
  });

  it("leaves when detaching push rejects", async () => {
    const s = steps();
    s.detachPush.mockRejectedValue(new Error("sdk"));
    await signOut("en", s);
    expect(s.leave).toHaveBeenCalledWith("/en/login");
  });
});

describe("localeFromPath", () => {
  it("reads the locale prefix the panel always carries", () => {
    expect(localeFromPath("/de/dashboard/workers")).toBe("de");
    expect(localeFromPath("/en")).toBe("en");
  });

  it("falls back to the default for a path without a known locale", () => {
    expect(localeFromPath("/dashboard")).toBe("en");
    expect(localeFromPath("/")).toBe("en");
    expect(localeFromPath("/fr/dashboard")).toBe("en");
  });
});
