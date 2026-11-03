import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

/**
 * The 401 → refresh path, against a fake backend that rotates refresh tokens
 * the way `RedisRefreshTokenStore.ValidateAndRotateAsync` does: a refresh
 * token works once, and the old one is deleted.
 */

const signOuts: string[] = [];
vi.mock("@/lib/http/sign-out-here", () => ({
  signOutHere: vi.fn(async () => {
    signOuts.push("signed out");
    localStorage.removeItem("auth-storage");
  }),
}));

// ── a browser: one localStorage shared by every "tab" ──────────────────────────
const storage = new Map<string, string>();
// `vi.stubGlobal`, not assignment: from Node 21 `navigator` is a getter-only
// global, and CI runs Node 24.
vi.stubGlobal("window", globalThis);
vi.stubGlobal("location", { pathname: "/en/dashboard", protocol: "https:" });
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
});
// The Web Locks API, shared by every tab of a browser as the real one is.
const lockTails = new Map<string, Promise<unknown>>();
vi.stubGlobal("navigator", {
  locks: {
    request: <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
      const run = (lockTails.get(name) ?? Promise.resolve()).then(fn, fn);
      lockTails.set(name, run.catch(() => {}));
      return run;
    },
  },
});

// ── a backend ──────────────────────────────────────────────────────────────────
let validAccess = new Set<string>();
let validRefresh = new Set<string>();
let minted = 0;

function reply(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  return { status, statusText: "", headers: {}, config, data };
}

async function fakeBackend(config: InternalAxiosRequestConfig) {
  const { AxiosError } = await import("axios");
  if (config.url?.endsWith("/api/Auth/refresh")) {
    const { refreshToken } = JSON.parse(config.data as string);
    await new Promise((r) => setTimeout(r, 20)); // a network round trip
    if (!validRefresh.delete(refreshToken)) {
      throw new AxiosError("401", "ERR_BAD_REQUEST", config, null, reply(config, 401, {}));
    }
    minted += 1;
    const access = `A${minted + 1}`;
    const refresh = `R${minted + 1}`;
    validAccess.add(access);
    validRefresh.add(refresh);
    return reply(config, 200, { accessToken: access, refreshToken: refresh, expireDate: "" });
  }
  if (config.url?.includes("/api/Auth/login")) return reply(config, 200, { accessToken: "A9" });
  const token = String(config.headers.Authorization ?? "").replace("Bearer ", "");
  if (!validAccess.has(token)) {
    throw new AxiosError("401", "ERR_BAD_REQUEST", config, null, reply(config, 401, {}));
  }
  return reply(config, 200, { ok: true });
}

/** One tab: its own copy of every module, as a browser tab has. */
async function openTab() {
  vi.resetModules();
  const axios = (await import("axios")).default;
  axios.defaults.adapter = fakeBackend as AxiosAdapter;
  const { apiClient } = await import("@/lib/http/client");
  apiClient.defaults.adapter = fakeBackend as AxiosAdapter;
  const { useAuthStore } = await import("@/store/auth.store");
  return { apiClient, useAuthStore };
}

const stored = () => JSON.parse(storage.get("auth-storage") ?? "{}").state ?? {};

beforeEach(() => {
  storage.clear();
  lockTails.clear();
  storage.set("auth-last-activity", String(Date.now()));
  signOuts.length = 0;
  minted = 0;
  // The browser comes back after the access token expired; the refresh token
  // is still inside its 7 days.
  validAccess = new Set();
  validRefresh = new Set(["R1"]);
  storage.set(
    "auth-storage",
    JSON.stringify({ state: { accessToken: "A1", refreshToken: "R1", isAuthenticated: true }, version: 0 }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("session refresh", () => {
  it("keeps the refreshed tokens when the auth store is written afterwards", async () => {
    const tab = await openTab();
    await tab.apiClient.get("/api/admin/dashboard");
    expect(stored().refreshToken).toBe("R2");

    // Any later write to the store, e.g. the permissions poll caching a grant set.
    tab.useAuthStore.getState().setCachedPermissions(["task:list_any"]);

    expect(stored().refreshToken).toBe("R2");
    await tab.apiClient.get("/api/admin/dashboard");
    expect(signOuts).toEqual([]);
  });

  it("survives two tabs refreshing at the same moment", async () => {
    const a = await openTab();
    const b = await openTab();

    const results = await Promise.allSettled([
      a.apiClient.get("/api/admin/dashboard"),
      b.apiClient.get("/api/admin/workers"),
    ]);

    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);
    expect(signOuts).toEqual([]);
    // One rotation, not two: the second tab took the token the first one got.
    expect(minted).toBe(1);
  });

  it("answers a late 401 from the same tab with the token already refreshed", async () => {
    const tab = await openTab();
    await Promise.all([
      tab.apiClient.get("/api/admin/a"),
      tab.apiClient.get("/api/admin/b"),
      tab.apiClient.get("/api/admin/c"),
    ]);
    expect(minted).toBe(1);
    expect(signOuts).toEqual([]);
  });

  it("still signs out when the refresh token itself is dead", async () => {
    validRefresh = new Set();
    const tab = await openTab();
    await expect(tab.apiClient.get("/api/admin/dashboard")).rejects.toBeTruthy();
    expect(signOuts).toEqual(["signed out"]);
  });
});

describe("idle timeout", () => {
  it("sends nothing after an hour without activity, and signs out", async () => {
    validAccess = new Set(["A1"]); // even a still-valid token
    storage.set("auth-last-activity", String(Date.now() - 61 * 60 * 1000));
    const tab = await openTab();
    const sent = vi.fn(fakeBackend);
    tab.apiClient.defaults.adapter = sent as AxiosAdapter;

    await expect(tab.apiClient.get("/api/admin/dashboard")).rejects.toBeTruthy();
    expect(sent).not.toHaveBeenCalled();
    expect(signOuts).toEqual(["signed out"]);
  });

  it("lets the login request through, which has no session to be idle", async () => {
    storage.delete("auth-last-activity");
    const tab = await openTab();
    await expect(
      tab.apiClient.post("/api/Auth/login?userType=Admin", { email: "a", password: "b" }),
    ).resolves.toBeTruthy();
    expect(signOuts).toEqual([]);
  });
});
