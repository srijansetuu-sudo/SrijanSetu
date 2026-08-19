"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { LoadingState } from "@/components/common/states";

export function ProtectedRoute({ roles, children }) {
  const router = useRouter();
  const { hydrated, isAuthenticated, role } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) router.replace("/login");
    if (roles?.length && role && !roles.includes(role)) router.replace("/");
  }, [hydrated, isAuthenticated, role, roles, router]);

  if (!hydrated || !isAuthenticated || (roles?.length && role && !roles.includes(role))) {
    return <LoadingState label="Checking access" />;
  }

  return children;
}

export function RoleGuard({ roles, children, fallback = null }) {
  const role = useAuthStore((state) => state.role);
  if (!roles.includes(role)) return fallback;
  return children;
}
