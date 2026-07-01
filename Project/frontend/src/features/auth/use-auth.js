"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { authService } from "@/services/api-services";
import { useAuthStore } from "@/store/auth-store";
import { queryKeys } from "@/constants/query-keys";

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSession = useAuthStore((state) => state.setSession);
  const query = useApiQuery(queryKeys.me, authService.me, {
    enabled: isAuthenticated,
  });
  useEffect(() => {
    if (query.data) setSession({ user: query.data });
  }, [query.data, setSession]);
  return query;
}

export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  return useApiMutation(authService.login, {
    onSuccess: (payload) => {
      const user = payload.user ?? payload;
      setSession({
        user,
        accessToken: payload.access_token ?? payload.accessToken,
        refreshToken: payload.refresh_token ?? payload.refreshToken,
      });
      toast.success("Welcome back");
      router.push("/profile?setup=1");
    },
  });
}

export function useSignup() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  return useApiMutation(authService.signup, {
    onSuccess: (payload) => {
      const user = payload.user ?? payload;
      setSession({
        user,
        accessToken: payload.access_token ?? payload.accessToken,
        refreshToken: payload.refresh_token ?? payload.refreshToken,
      });
      toast.success("Account created");
      router.push("/profile?setup=1");
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  return useApiMutation(() => authService.logout(refreshToken), {
    onMutate: () => {
      clearSession();
      router.push("/login");
    },
    showErrorToast: false,
    onError: () => {},
  });
}
