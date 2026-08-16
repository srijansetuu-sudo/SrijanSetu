import axios from "axios";
import { useAuthStore } from "@/store/auth-store";

const baseURL = process.env.NEXT_PUBLIC_API_URL;

if (!baseURL) {
  throw new Error("NEXT_PUBLIC_API_URL is required.");
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export function websocketUrl(path, params = {}) {
  const url = new URL(`${baseURL.replace(/\/$/, "")}${path}`, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });
  return url.toString();
}

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status !== 401 || original?._retry || original?.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().clearSession();
      if (typeof window !== "undefined") window.location.href = "/login";
      return Promise.reject(error);
    }

    original._retry = true;
    refreshPromise =
      refreshPromise ||
      api.post("/auth/refresh", { refresh_token: refreshToken }).then((response) => {
        const payload = response.data?.data ?? response.data;
        useAuthStore.getState().setSession({
          user: payload.user,
          accessToken: payload.access_token ?? payload.accessToken,
          refreshToken: payload.refresh_token ?? payload.refreshToken ?? refreshToken,
        });
        return payload.access_token ?? payload.accessToken;
      });

    try {
      const newToken = await refreshPromise;
      refreshPromise = null;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      refreshPromise = null;
      useAuthStore.getState().clearSession();
      if (typeof window !== "undefined") window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  }
);
