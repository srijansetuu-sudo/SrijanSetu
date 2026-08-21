"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useApiQuery } from "@/hooks/use-api";
import { creatorService } from "@/services/api-services";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { LoadingState } from "@/components/common/states";
import { toast } from "sonner";

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function isProfileRoute(pathname) {
  return pathname === "/profile" || pathname === "/dashboard/creator/profile";
}

function isBaseProfileComplete(user) {
  return [
    user?.full_name,
    user?.phone_number,
    user?.address_line,
    user?.city,
    user?.state,
    user?.postal_code,
  ].every(hasValue);
}

function isCreatorProfileComplete(profile) {
  return [
    profile?.brand_name,
    profile?.headline,
    profile?.description,
    profile?.categories,
  ].every(hasValue);
}

export function ProtectedRoute({ roles, children, requireProfile = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, isAuthenticated, role, user } = useAuthStore();
  const profileToastShown = useRef(false);
  const profileRoute = isProfileRoute(pathname);
  const shouldCheckProfile = requireProfile && hydrated && isAuthenticated && !profileRoute;
  const shouldCheckCreatorProfile = shouldCheckProfile && role === "CREATOR";
  const creatorProfile = useApiQuery(queryKeys.creatorProfileMe, creatorService.myProfile, {
    enabled: shouldCheckCreatorProfile,
    retry: false,
  });

  const roleBlocked = Boolean(roles?.length && role && !roles.includes(role));
  const baseProfileIncomplete = shouldCheckProfile && !isBaseProfileComplete(user);
  const creatorProfileIncomplete = shouldCheckCreatorProfile && !creatorProfile.isLoading && !isCreatorProfileComplete(creatorProfile.data);
  const profileIncomplete = baseProfileIncomplete || creatorProfileIncomplete;

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (roleBlocked) {
      router.replace("/");
      return;
    }
    if (profileIncomplete) {
      if (!profileToastShown.current) {
        toast.error("Complete the required details in your profile to continue", { duration: 7000 });
        profileToastShown.current = true;
      }
      router.replace("/profile?setup=1");
    } else {
      profileToastShown.current = false;
    }
  }, [hydrated, isAuthenticated, profileIncomplete, roleBlocked, router]);

  if (!hydrated || !isAuthenticated || roleBlocked) {
    return <LoadingState label="Checking access" />;
  }

  if (shouldCheckCreatorProfile && creatorProfile.isLoading) {
    return <LoadingState label="Checking profile" />;
  }

  if (profileIncomplete) {
    return <LoadingState label="Complete your profile" />;
  }

  return children;
}

export function RoleGuard({ roles, children, fallback = null }) {
  const role = useAuthStore((state) => state.role);
  if (!roles.includes(role)) return fallback;
  return children;
}
