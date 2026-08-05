"use client";

import Link from "next/link";
import { Bell, Briefcase, Camera, FileText, IndianRupee, MessageSquare, Star, User, UserCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { creatorService, notificationService, orderService, requirementService } from "@/services/api-services";
import { asArray, money } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

function StatCard({ icon: Icon, label, value, href }) {
  return (
    <Card>
      <CardContent>
        <Icon className="h-5 w-5 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
        {href ? <Button asChild variant="outline" size="sm" className="mt-4"><Link href={href}>Open</Link></Button> : null}
      </CardContent>
    </Card>
  );
}

function ProfileOverview({ user, role, creator, unreadNotifications = 0 }) {
  const displayName = creator?.brand_name || user?.full_name || "Complete your profile";
  const subtitle = role === "CREATOR" ? creator?.headline || "Add your headline so customers know what you make." : "Customer profile";
  const contactItems = [user?.phone_number, user?.address_line, user?.city, user?.state, user?.postal_code];
  const completionItems = role === "CREATOR"
    ? [user?.full_name, user?.avatar_url, ...contactItems, creator?.brand_name, creator?.headline, creator?.description]
    : [user?.full_name, user?.avatar_url, ...contactItems];
  const completed = completionItems.filter(Boolean).length;
  const completion = Math.round((completed / completionItems.length) * 100);

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserCircle className="h-10 w-10 text-muted-foreground" />}
              {unreadNotifications > 0 ? <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-background bg-accent" aria-label="Unread notifications" /> : null}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase text-muted-foreground">{role === "CREATOR" ? "Creator profile" : "Customer profile"}</p>
              <h2 className="mt-1 truncate text-2xl font-bold text-primary">{displayName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="min-w-[180px]">
            <div className="flex items-center justify-between text-sm font-semibold text-primary">
              <span>Profile completion</span>
              <span>{completion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${completion}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm"><Link href="/profile"><Camera className="h-4 w-4" />Profile</Link></Button>
              <Button asChild variant={unreadNotifications > 0 ? "accent" : "outline"} size="sm"><Link href="/notifications" className="relative"><Bell className="h-4 w-4" />{unreadNotifications > 0 ? unreadNotifications : "Alerts"}</Link></Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeliveryNotice() {
  return (
    <Card>
      <CardContent>
        <p className="font-semibold text-primary">Delivery is coordinated directly</p>
        <p className="mt-1 text-sm text-muted-foreground">SrijanSetu does not support delivery logistics yet. Customers and creators should coordinate delivery using their profile contact details; platform delivery support is planned for the future.</p>
      </CardContent>
    </Card>
  );
}

export function CustomerDashboardPage() {
  const { user, role } = useAuthStore();
  const requirements = useApiQuery(queryKeys.myRequirements, requirementService.my);
  const saved = useApiQuery(queryKeys.savedCreators, creatorService.saved);
  const notifications = useApiQuery(queryKeys.notifications, notificationService.list, { refetchOnMount: "always" });
  return (
    <ProtectedRoute roles={["CUSTOMER"]}>
      <DashboardShell>
        <h1 className="text-3xl font-bold text-primary">Customer Dashboard</h1>
        <div className="mt-6"><ProfileOverview user={user} role={role} unreadNotifications={asArray(notifications.data).filter((item) => !item.is_read).length} /></div>
        <div className="mt-6"><DeliveryNotice /></div>
        <div className="mt-6 grid gap-5 md:grid-cols-4">
          <StatCard icon={FileText} label="My Requirements" value={asArray(requirements.data).length} href="/dashboard/customer/requirements" />
          <StatCard icon={Star} label="Saved Creators" value={asArray(saved.data).length} href="/dashboard/customer/saved-creators" />
          <StatCard icon={MessageSquare} label="Workspaces" value="Open" href="/workspaces" />
          <StatCard icon={Bell} label="Notifications" value={asArray(notifications.data).filter((item) => !item.is_read).length} href="/notifications" />
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function CreatorDashboardPage() {
  const { user, role } = useAuthStore();
  const creatorProfile = useApiQuery(queryKeys.creatorProfileMe, creatorService.myProfile, { retry: false });
  const requirements = useApiQuery(queryKeys.requirements({ limit: 10 }), () => requirementService.list({ limit: 10 }));
  const orders = useApiQuery(queryKeys.orders, orderService.list);
  const notifications = useApiQuery(queryKeys.notifications, notificationService.list, { refetchOnMount: "always" });
  const payoutReady = asArray(orders.data).reduce((sum, order) => order.payout_ready_at ? sum + Number(order.creator_payout_amount ?? 0) : sum, 0);
  return (
    <ProtectedRoute roles={["CREATOR"]}>
      <DashboardShell role="CREATOR">
        <h1 className="text-3xl font-bold text-primary">Creator Dashboard</h1>
        <div className="mt-6"><ProfileOverview user={user} role={role} creator={creatorProfile.data} unreadNotifications={asArray(notifications.data).filter((item) => !item.is_read).length} /></div>
        <div className="mt-6"><DeliveryNotice /></div>
        <div className="mt-6 grid gap-5 md:grid-cols-6">
          <StatCard icon={User} label="Profile" value="Edit" href="/dashboard/creator/profile" />
          <StatCard icon={FileText} label="Available Requirements" value={asArray(requirements.data).length} href="/dashboard/creator/requirements" />
          <StatCard icon={Briefcase} label="My Quotations" value="Track" href="/dashboard/creator/quotations" />
          <StatCard icon={MessageSquare} label="Workspaces" value="Open" href="/workspaces" />
          <StatCard icon={IndianRupee} label="Payouts Ready" value={money(payoutReady)} href="/workspaces" />
          <StatCard icon={Bell} label="Notifications" value={asArray(notifications.data).filter((item) => !item.is_read).length} href="/notifications" />
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
