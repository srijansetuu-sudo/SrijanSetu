"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import { useAuthStore } from "@/store/auth-store";

export function AppProviders({ children }) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <QueryProvider>
      {children}
      <Toaster richColors position="top-right" />
    </QueryProvider>
  );
}
