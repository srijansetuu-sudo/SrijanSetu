"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Headphones, LayoutDashboard, LogOut, Menu, MessageSquare, UserCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { useCurrentUser, useLogout } from "@/features/auth/use-auth";
import { useApiQuery } from "@/hooks/use-api";
import { asArray, cn } from "@/lib/utils";
import { notificationService } from "@/services/api-services";

function mergeLinks(groups) {
  const seen = new Set();
  return groups.flat().filter((link) => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function isActiveLink(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href === "/workspaces") return pathname === href || pathname.startsWith("/orders/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar({ mobileLinks = [] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isAuthenticated, role, user } = useAuthStore();
  const logout = useLogout();
  const notifications = useApiQuery(queryKeys.notifications, notificationService.list, { enabled: isAuthenticated, refetchOnMount: "always" });
  const notificationItems = asArray(notifications.data);
  const unreadNotifications = notificationItems.filter((item) => !item.is_read).length;
  useCurrentUser();
  const dashboard = role === "CREATOR" ? "/dashboard/creator" : role === "ADMIN" ? "/dashboard/admin" : "/dashboard/customer";
  const links = role === "ADMIN"
    ? [
        { href: "/dashboard/admin", label: "Admin dashboard" },
        { href: "/dashboard/admin/contact", label: "Contact inbox" },
      ]
    : isAuthenticated
      ? [
          { href: "/creators", label: "Creators" },
          { href: role === "CREATOR" ? "/dashboard/creator/requirements" : "/dashboard/customer/requirements", label: role === "CREATOR" ? "Requirements" : "My Requirements" },
          { href: "/contact", label: "Contact" },
        ]
      : [{ href: "/contact", label: "Contact" }];
  const accountLinks = isAuthenticated
    ? [
        { href: "/profile", label: "Profile overview" },
        { href: dashboard, label: "Dashboard" },
        { href: "/workspaces", label: "Workspaces" },
        { href: "/notifications", label: "Notifications", notifications: unreadNotifications },
      ]
    : [{ href: "/login", label: "Login" }];
  const menuLinks = mergeLinks([links, mobileLinks, accountLinks]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/srijansetu-logo.png" alt="SrijanSetu" width={42} height={42} className="rounded-md" />
          <div className="leading-tight">
            <p className="font-bold text-primary">SrijanSetu</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Discover Handmade Art</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => {
            const active = isActiveLink(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors",
                  active ? "bg-primary/10 text-primary shadow-[0_0_0_1px_rgba(31,44,119,0.12)]" : "text-muted-foreground hover:text-primary"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <div className="relative">
              <button className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-primary shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-primary/15 active:translate-y-0" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
                <span className="relative h-8 w-8 shrink-0">
                  <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-muted">
                    {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserCircle className="h-5 w-5" />}
                  </span>
                  {unreadNotifications > 0 ? <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-accent shadow-sm" aria-label="Unread notifications" /> : null}
                </span>
                <span className="max-w-[140px] truncate">{user?.full_name ?? "Profile"}</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
              </button>
              <div className={`absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-border bg-white p-2 shadow-xl transition-all duration-200 ease-out ${profileOpen ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100" : "invisible pointer-events-none -translate-y-2 scale-95 opacity-0"}`}>
                <Link href="/profile" onClick={() => setProfileOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition duration-150 hover:translate-x-0.5 hover:bg-muted", isActiveLink(pathname, "/profile") && "bg-primary/10 shadow-[0_0_0_1px_rgba(31,44,119,0.12)]")}><UserCircle className="h-4 w-4" />Profile overview</Link>
                <Link href={dashboard} onClick={() => setProfileOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition duration-150 hover:translate-x-0.5 hover:bg-muted", isActiveLink(pathname, dashboard) && "bg-primary/10 shadow-[0_0_0_1px_rgba(31,44,119,0.12)]")}><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                {role === "ADMIN" ? <Link href="/dashboard/admin/contact" onClick={() => setProfileOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition duration-150 hover:translate-x-0.5 hover:bg-muted", isActiveLink(pathname, "/dashboard/admin/contact") && "bg-primary/10 shadow-[0_0_0_1px_rgba(31,44,119,0.12)]")}><Headphones className="h-4 w-4" />Contact inbox</Link> : null}
                <Link href="/workspaces" onClick={() => setProfileOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition duration-150 hover:translate-x-0.5 hover:bg-muted", isActiveLink(pathname, "/workspaces") && "bg-primary/10 shadow-[0_0_0_1px_rgba(31,44,119,0.12)]")}><MessageSquare className="h-4 w-4" />Workspaces</Link>
                <Link href="/notifications" onClick={() => setProfileOpen(false)} className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-primary transition duration-150 hover:translate-x-0.5 hover:bg-muted", isActiveLink(pathname, "/notifications") && "bg-primary/10 shadow-[0_0_0_1px_rgba(31,44,119,0.12)]")}>
                  <span className="flex items-center gap-3"><Bell className="h-4 w-4" />Notifications</span>
                  {unreadNotifications > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-primary">{unreadNotifications}</span> : null}
                </Link>
                <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-primary transition duration-150 hover:translate-x-0.5 hover:bg-muted" onClick={() => { setProfileOpen(false); logout.mutate(); }}><LogOut className="h-4 w-4" />Logout</button>
              </div>
            </div>
          ) : (
            <>
              <Button asChild="true" variant="ghost"><Link href="/login">Login</Link></Button>
              <Button asChild="true" variant="accent"><Link href="/signup">Sign up</Link></Button>
            </>
          )}
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation menu"><Menu className="h-6 w-6" /></button>
      </div>
      <div className={`absolute left-0 right-0 top-16 grid overflow-hidden border-t border-border bg-white shadow-xl transition-all duration-300 ease-out md:hidden ${open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}>
        <div className={`min-h-0 transition-transform duration-300 ease-out ${open ? "translate-y-0" : "-translate-y-3"}`}>
          <div className="grid gap-3 p-4">
            {menuLinks.map((link) => {
              const active = isActiveLink(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 font-semibold transition-colors",
                    active ? "bg-primary text-white shadow-[0_10px_24px_rgba(31,44,119,0.22)]" : "text-primary hover:bg-muted"
                  )}
                >
                  <span>{link.label}</span>
                  {link.notifications > 0 ? <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold", active ? "bg-white text-primary" : "bg-accent text-primary")}>{link.notifications}</span> : null}
                </Link>
              );
            })}
            {isAuthenticated ? <button className="text-left font-semibold text-primary" onClick={() => { setOpen(false); logout.mutate(); }}>Logout</button> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
