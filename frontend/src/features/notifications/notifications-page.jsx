"use client";

import { Navbar } from "@/components/layout/navbar";
import { NotificationCard } from "@/components/common/cards";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ProtectedRoute } from "@/components/common/protected-route";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { notificationService } from "@/services/api-services";
import { asArray } from "@/lib/utils";

export function NotificationsPage() {
  const query = useApiQuery(queryKeys.notifications, notificationService.list, { refetchOnMount: "always" });
  const read = useApiMutation(notificationService.read, { invalidate: queryKeys.notifications });
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container-page py-10">
        <h1 className="text-3xl font-bold text-primary">Notifications</h1>
        <div className="mt-6 grid gap-4">
          {query.isLoading ? <LoadingState /> : asArray(query.data).length ? asArray(query.data).map((item) => <NotificationCard key={item.id} notification={item} onRead={() => read.mutateAsync(item.id)} />) : <EmptyState title="No notifications" />}
        </div>
      </main>
    </ProtectedRoute>
  );
}
