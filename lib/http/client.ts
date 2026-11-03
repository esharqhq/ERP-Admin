import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { isSessionMintingEndpoint } from "@/lib/http/auth-endpoint";
import { localeFromPath } from "@/lib/http/sign-out";
import { signOutHere } from "@/lib/http/sign-out-here";
import { idleExpiredHere } from "@/lib/auth/idle";
import { useAuthStore } from "@/store/auth.store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─── Request interceptor: idle timeout, then the access token ───────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") return config;

  // An hour without the admin touching the panel ends the session
  // (`lib/auth/idle.ts`). Checked here as well as in `SessionGate`, because a
  // refetch on wake can fire before the gate's own check runs.
  if (!isSessionMintingEndpoint(config.url) && idleExpiredHere()) {
    void signOutHere(localeFromPath(window.location.pathname));
    return Promise.reject(new Error("session_idle"));
  }

  const token = readTokens().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor: refresh on 401 ────────────────────────────────────
//
// Two bugs lived here, and together they made an expired session open the
// dashboard, show data for a few seconds, and only then fall to the login page:
//
// 1. The refreshed tokens went straight into localStorage while the zustand
//    store kept the old ones in memory. The next write to the store (a changed
//    grant set, a profile edit) persisted the old pair back, and the old
//    refresh token is dead: the backend deletes it on use
//    (`RedisRefreshTokenStore.ValidateAndRotateAsync`). The next 401 then ended
//    in a sign-out. Tokens are now written through the store.
// 2. Tabs restored together all refreshed with the same one-use token. One won;
//    the others were refused and signed out, which wiped the winner's tokens
//    too. A refresh now runs under a browser-wide lock, and inside it a token
//    that differs from the one the failed request carried means another tab
//    (or an earlier 401 in this one) already refreshed, so it is reused.

const REFRESH_LOCK = "uyer-admin-auth-refresh";

interface StoredTokens {
  accessToken?: string | null;
  refreshToken?: string | null;
}

/** The tokens as storage holds them now: storage is shared by every tab. */
function readTokens(): StoredTokens {
  try {
    const parsed = JSON.parse(localStorage.getItem("auth-storage") ?? "{}") as {
      state?: StoredTokens;
    };
    return parsed?.state ?? {};
  } catch {
    return {}; // corrupt storage: no session
  }
}

let localTail: Promise<unknown> = Promise.resolve();

/** Run `fn` alone across every tab; one tab at a time where Web Locks are missing. */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    // The lock resolves with what `fn` resolves to; its typing nests the promise.
    return navigator.locks.request(REFRESH_LOCK, fn) as Promise<T>;
  }
  const run = localTail.then(fn, fn);
  localTail = run.catch(() => {});
  return run;
}

/**
 * An access token newer than `staleToken`: one another refresh already got,
 * or a fresh pair from `/api/Auth/refresh`.
 */
function freshAccessToken(staleToken: string | undefined): Promise<string> {
  return withRefreshLock(async () => {
    const current = readTokens();
    if (current.accessToken && current.accessToken !== staleToken) {
      return current.accessToken;
    }
    if (!current.refreshToken) throw new Error("No refresh token");

    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
      expireDate: string;
    }>(`${BASE_URL}/api/Auth/refresh`, { refreshToken: current.refreshToken });

    // Through the store, so its memory and storage agree (bug 1 above).
    useAuthStore.setState({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expireDate: data.expireDate,
    });
    return data.accessToken;
  });
}

function bearerOf(config: InternalAxiosRequestConfig): string | undefined {
  const header = config.headers?.Authorization;
  return typeof header === "string" ? header.replace(/^Bearer\s+/i, "") : undefined;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // A 401 from login is a rejected password, not an expired session: there is
    // nothing to refresh, and sending it down the branch below ends in a page
    // reload that throws away the error the form was about to show. Hand it back
    // to the caller so `useLogin`'s `error` survives and the banner renders.
    if (
      !original ||
      error.response?.status !== 401 ||
      original._retry ||
      isSessionMintingEndpoint(original.url)
    ) {
      return Promise.reject(error);
    }
    original._retry = true;

    let token: string;
    try {
      token = await freshAccessToken(bearerOf(original));
    } catch (refreshError) {
      // Same teardown as Log out. The full page load drops the query cache.
      void signOutHere(localeFromPath(window.location.pathname));
      return Promise.reject(refreshError);
    }
    original.headers.Authorization = `Bearer ${token}`;
    return apiClient(original);
  },
);
