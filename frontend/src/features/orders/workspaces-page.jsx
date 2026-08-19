"use client";

import Link from "next/link";
import { Briefcase, MessageSquare, UserCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { orderService } from "@/services/api-services";
import { asArray, dateLabel, money } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

function personName(person, fallback = "User") {
  return person?.brand_name || person?.full_name || fallback;
}

function PersonLine({ label, person, linkProfile = false }) {
  const name = personName(person, label);
  const content = (
    <span className="inline-flex min-w-0 items-center gap-2 font-bold text-primary">
      {person?.avatar_url ? <img src={person.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" /> : <UserCircle className="h-5 w-5 shrink-0" />}
      <span className="truncate">{name}</span>
    </span>
  );

  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      {linkProfile && person?.creator_profile_id ? (
        <Link href={`/creators/${person.creator_profile_id}`} className="mt-1 block hover:underline">
          {content}
        </Link>
      ) : (
        <p className="mt-1">{content}</p>
      )}
    </div>
  );
}

function WorkspaceCard({ order }) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-primary">{order.requirement_title || "Order Workspace"}</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">Order {order.id}</p>
              </div>
            </div>
          </div>
          <Badge variant="primary">{order.status}</Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <PersonLine label="Customer" person={order.customer} />
          <PersonLine label="Creator" person={order.creator} linkProfile />
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="mt-1 font-bold text-primary">{money(order.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Updated</p>
            <p className="mt-1 font-bold text-primary">{dateLabel(order.updated_at)}</p>
          </div>
        </div>

        <Button asChild className="mt-5" size="sm">
          <Link href={`/orders/${order.id}`}>
            <Briefcase className="h-4 w-4" />
            Open workspace
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function WorkspacesPage() {
  const { role } = useAuthStore();
  const query = useApiQuery(queryKeys.orders, orderService.list);
  const orders = asArray(query.data);

  return (
    <ProtectedRoute>
      <DashboardShell role={role}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Chats and delivery</p>
            <h1 className="mt-1 text-3xl font-bold text-primary">Workspaces</h1>
          </div>
          <Badge>{orders.length} total</Badge>
        </div>

        <div className="mt-6 grid gap-4">
          {query.isLoading ? (
            <LoadingState />
          ) : orders.length ? (
            orders.map((order) => <WorkspaceCard key={order.id} order={order} />)
          ) : (
            <EmptyState title="No workspaces yet" />
          )}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
