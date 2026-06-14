import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─── Request interceptor: attach access token ────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") return config;

  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return config;

    const parsed = JSON.parse(raw) as {
      state?: { accessToken?: string };
    };
    const token = parsed?.state?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // corrupt storage — ignore
  }
  return config;
});

// ─── Response interceptor: refresh on 401 ────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(error: unknown, token?: string) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const raw = localStorage.getItem("auth-storage");
      const parsed = JSON.parse(raw ?? "{}") as {
        state?: { refreshToken?: string };
      };
      const refreshToken = parsed?.state?.refreshToken;
      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
        expireDate: string;
      }>(`${BASE_URL}/api/Auth/refresh`, { refreshToken });

      // update persisted store
      const stored = JSON.parse(raw ?? "{}");
      stored.state = {
        ...stored.state,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expireDate: data.expireDate,
      };
      localStorage.setItem("auth-storage", JSON.stringify(stored));

      flushQueue(null, data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      flushQueue(refreshError);
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
