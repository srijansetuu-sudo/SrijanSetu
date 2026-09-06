"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, CheckCheck, Inbox, Mail, MailOpen } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ProtectedRoute } from "@/components/common/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { notificationService } from "@/services/api-services";
import { asArray, cn, dateLabel } from "@/lib/utils";

const filters = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];

export function NotificationsPage() {
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const query = useApiQuery(queryKeys.notifications, notificationService.list, { refetchOnMount: "always" });
  const notifications = asArray(query.data);
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const readCount = notifications.length - unreadCount;
  const visibleNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((item) => !item.is_read);
    if (filter === "read") return notifications.filter((item) => item.is_read);
    return notifications;
  }, [filter, notifications]);
  const visibleIds = visibleNotifications.map((item) => item.id);
  const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  const clearSelection = () => setSelectedIds([]);
  const read = useApiMutation(notificationService.read, { invalidate: queryKeys.notifications });
  const markAllRead = useApiMutation(notificationService.markAllRead, { successMessage: "All notifications marked read", invalidate: queryKeys.notifications, onSuccess: clearSelection });
  const bulkUpdate = useApiMutation(notificationService.bulkUpdate, { successMessage: "Notifications updated", invalidate: queryKeys.notifications, onSuccess: clearSelection });

  const toggleSelected = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleSelectVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const updateSelected = (isRead) => {
    if (!selectedVisibleIds.length) return;
    bulkUpdate.mutate({ ids: selectedVisibleIds, is_read: isRead });
  };

  const openNotification = async (event, notification) => {
    if (notification.is_read) return;
    event.preventDefault();
    await read.mutateAsync(notification.id);
    window.location.href = notification.action_url || "/notifications";
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_42%,#fff8d6_100%)] py-10">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm">
                <Bell className="h-4 w-4" />
                Notification center
              </div>
              <h1 className="mt-4 text-4xl font-bold text-primary">Notifications</h1>
              <p className="mt-2 text-sm text-muted-foreground">Track updates from orders, messages, quotations, and admin actions.</p>
            </div>
            <Button variant="accent" disabled={!unreadCount || markAllRead.isPending} onClick={() => markAllRead.mutate()}>
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card className="border-primary/10 bg-white/90">
              <CardContent className="flex items-center justify-between p-5">
                <span>
                  <span className="block text-sm font-semibold text-muted-foreground">Total</span>
                  <span className="mt-1 block text-3xl font-bold text-primary">{notifications.length}</span>
                </span>
                <Inbox className="h-7 w-7 text-primary" />
              </CardContent>
            </Card>
            <Card className="border-primary/10 bg-white/90">
              <CardContent className="flex items-center justify-between p-5">
                <span>
                  <span className="block text-sm font-semibold text-muted-foreground">Unread</span>
                  <span className="mt-1 block text-3xl font-bold text-primary">{unreadCount}</span>
                </span>
                <Mail className="h-7 w-7 text-accent" />
              </CardContent>
            </Card>
            <Card className="border-primary/10 bg-white/90">
              <CardContent className="flex items-center justify-between p-5">
                <span>
                  <span className="block text-sm font-semibold text-muted-foreground">Read</span>
                  <span className="mt-1 block text-3xl font-bold text-primary">{readCount}</span>
                </span>
                <MailOpen className="h-7 w-7 text-primary" />
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-border bg-white shadow-[0_20px_60px_rgba(31,44,119,0.10)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-4">
              <div className="flex flex-wrap gap-2">
                {filters.map((item) => (
                  <Button key={item.id} type="button" size="sm" variant={filter === item.id ? "primary" : "outline"} onClick={() => { setFilter(item.id); clearSelection(); }}>
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" disabled={!visibleIds.length} onClick={toggleSelectVisible}>
                  {allVisibleSelected ? "Clear selection" : "Select visible"}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!selectedVisibleIds.length || bulkUpdate.isPending} onClick={() => updateSelected(true)}>
                  <MailOpen className="h-4 w-4" />
                  Mark read
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!selectedVisibleIds.length || bulkUpdate.isPending} onClick={() => updateSelected(false)}>
                  <Mail className="h-4 w-4" />
                  Mark unread
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border">
              {query.isLoading ? <LoadingState /> : visibleNotifications.length ? visibleNotifications.map((notification) => {
                const href = notification.action_url || "/notifications";
                const selected = selectedIds.includes(notification.id);
                return (
                  <div key={notification.id} className={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-4 transition-colors", notification.is_read ? "bg-white hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10")}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelected(notification.id)}
                      className="mt-1 h-4 w-4 rounded border-border accent-primary"
                      aria-label={`Select ${notification.title}`}
                    />
                    <Link href={href} onClick={(event) => openNotification(event, notification)} className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-primary">{notification.title}</p>
                            {!notification.is_read ? <Badge variant="accent">New</Badge> : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{dateLabel(notification.created_at)}</span>
                      </div>
                    </Link>
                  </div>
                );
              }) : <div className="p-8"><EmptyState title="No notifications found" /></div>}
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
