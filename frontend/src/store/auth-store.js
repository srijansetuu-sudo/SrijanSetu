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
    const accessToken = sessionStorage.getItem("srijansetu_access_token");
    const refreshToken = sessionStorage.getItem("srijansetu_refresh_token");
    const rawUser = sessionStorage.getItem("srijansetu_user");
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
      if (accessToken) sessionStorage.setItem("srijansetu_access_token", accessToken);
      if (refreshToken) sessionStorage.setItem("srijansetu_refresh_token", refreshToken);
      if (user) sessionStorage.setItem("srijansetu_user", JSON.stringify(user));
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
      sessionStorage.removeItem("srijansetu_access_token");
      sessionStorage.removeItem("srijansetu_refresh_token");
      sessionStorage.removeItem("srijansetu_user");
    }
    set({ ...initialUser, hydrated: true });
  },
}));
