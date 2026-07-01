"use client";

import { create } from "zustand";

const initialUser = {
  user: null,
  role: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  hydrated: false,
};

export const useAuthStore = create((set, get) => ({
  ...initialUser,
  hydrate: () => {
    if (typeof window === "undefined") return;
    const accessToken = localStorage.getItem("srijansetu_access_token");
    const refreshToken = localStorage.getItem("srijansetu_refresh_token");
    const rawUser = localStorage.getItem("srijansetu_user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    set({
      user,
      role: user?.role ?? null,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(accessToken),
      hydrated: true,
    });
  },
  setSession: ({ user, accessToken, refreshToken }) => {
    if (typeof window !== "undefined") {
      if (accessToken) localStorage.setItem("srijansetu_access_token", accessToken);
      if (refreshToken) localStorage.setItem("srijansetu_refresh_token", refreshToken);
      if (user) localStorage.setItem("srijansetu_user", JSON.stringify(user));
    }
    set({
      user: user ?? get().user,
      role: user?.role ?? get().role,
      accessToken: accessToken ?? get().accessToken,
      refreshToken: refreshToken ?? get().refreshToken,
      isAuthenticated: Boolean(accessToken ?? get().accessToken),
      hydrated: true,
    });
  },
  clearSession: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("srijansetu_access_token");
      localStorage.removeItem("srijansetu_refresh_token");
      localStorage.removeItem("srijansetu_user");
    }
    set({ ...initialUser, hydrated: true });
  },
}));
