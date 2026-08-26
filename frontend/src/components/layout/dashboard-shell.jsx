"use client";

import { Bell, Briefcase, CreditCard, FileText, Headphones, Home, MessageSquare, Star, User, Users } from "lucide-react";
import { asArray } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { notificationService } from "@/services/api-services";

const customerLinks = [
  { href: "/dashboard/customer", label: "Overview", icon: Home },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/creators", label: "Creators", icon: Briefcase },
  { href: "/dashboard/customer/requirements", label: "My Requirements", icon: FileText },
  { href: "/dashboard/customer/saved-creators", label: "Saved Creators", icon: Star },
  { href: "/workspaces", label: "Workspaces", icon: MessageSquare },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const creatorLinks = [
  { href: "/dashboard/creator", label: "Overview", icon: Home },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/creators", label: "Creators", icon: Briefcase },
  { href: "/dashboard/creator/requirements", label: "Requirements", icon: FileText },
  { href: "/dashboard/creator/quotations", label: "Quotations", icon: MessageSquare },
  { href: "/workspaces", label: "Workspaces", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const adminLinks = [
  { href: "/dashboard/admin", label: "Overview", icon: Home },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/payouts", label: "Payouts", icon: CreditCard },
  { href: "/dashboard/admin/requirements", label: "Requirements", icon: FileText },
  { href: "/dashboard/admin/quotations", label: "Quotations", icon: MessageSquare },
  { href: "/workspaces", label: "Workspaces", icon: MessageSquare },
  { href: "/dashboard/admin/contact", label: "Contact inbox", icon: Headphones },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function DashboardShell({ role = "CUSTOMER", children }) {
  const links = role === "CREATOR" ? creatorLinks : role === "ADMIN" ? adminLinks : customerLinks;
  const notifications = useApiQuery(queryKeys.notifications, notificationService.list, { refetchOnMount: "always" });
  const unreadNotifications = asArray(notifications.data).filter((item) => !item.is_read).length;
  const mobileLinks = links.map((item) => ({
    href: item.href,
    label: item.label,
    notifications: item.href === "/notifications" ? unreadNotifications : undefined,
  }));

  return (
    <>
      <Navbar mobileLinks={mobileLinks} forceMenu />
      <div className="px-4 py-8 md:px-6 lg:px-8">
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}
