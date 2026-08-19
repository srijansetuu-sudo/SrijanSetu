"use client";

import Link from "next/link";
import { Activity, BarChart3, CheckCircle2, Clock, FileText, Headphones, IndianRupee, MessageSquare, Trash2, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { EmptyState, LoadingState } from "@/components/common/states";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { adminService, contactService } from "@/services/api-services";
import { queryKeys } from "@/constants/query-keys";
import { asArray, dateLabel, money } from "@/lib/utils";

const percentLabel = (value) => `${Number(value ?? 0).toFixed(1)}%`;

function StatCard({ icon: Icon, label, value, description, href }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {href ? <Button asChild variant="outline" size="sm" className="mt-4"><Link href={href}>View</Link></Button> : null}
      </CardContent>
    </Card>
  );
}

function EntityCard({ title, subtitle, metadata, actions }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold text-muted-foreground">{title}</p>
            <p className="mt-2 break-words text-lg font-bold text-primary">{subtitle}</p>
          </div>
          <div className="shrink-0">{actions}</div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          {metadata.map((item) => (
            <div key={item.label} className="flex min-w-0 items-start gap-2">
              <span className="shrink-0 font-semibold text-primary">{item.label}:</span>
              <span className="min-w-0 break-words">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const query = useApiQuery(queryKeys.adminStats, adminService.stats);
  const stats = query.data ?? {};

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <DashboardShell role="ADMIN">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Admin console</p>
            <h1 className="mt-1 text-3xl font-bold text-primary">Site management</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Monitor active users, marketplace demand, and content moderation from one admin dashboard.</p>
          </div>
          <Button asChild variant="accent"><Link href="/dashboard/admin/users">Manage users</Link></Button>
        </div>

        {query.isLoading ? <LoadingState /> : (
          <div className="grid gap-6">
            <div className="grid gap-5 xl:grid-cols-4">
              <StatCard icon={Users} label="Total users" value={stats.total_users ?? 0} description={`${stats.active_users ?? 0} active • ${stats.total_creators ?? 0} creators • ${stats.total_customers ?? 0} customers`} href="/dashboard/admin/users" />
              <StatCard icon={Activity} label="Online sessions" value={stats.online_sessions ?? 0} description={`${stats.online_users ?? 0} non-admin users currently signed in`} />
              <StatCard icon={IndianRupee} label="Revenue this month" value={money(stats.revenue_this_month ?? 0)} description={`${money(stats.revenue_this_year ?? 0)} this year`} />
              <StatCard icon={Headphones} label="Open contact items" value={stats.open_contact_submissions ?? 0} description="Feedback, complaints, and queries" href="/dashboard/admin/contact" />
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-primary">Marketplace activity</h2>
              <div className="grid gap-5 xl:grid-cols-4">
                <StatCard icon={FileText} label="Requirements" value={stats.total_requirements ?? 0} description={`${stats.open_requirements ?? 0} open • ${stats.completed_requirements ?? 0} completed`} href="/dashboard/admin/requirements" />
                <StatCard icon={MessageSquare} label="Quotations" value={stats.total_quotations ?? 0} description={`${stats.pending_quotations ?? 0} pending • ${stats.accepted_quotations ?? 0} accepted`} href="/dashboard/admin/quotations" />
                <StatCard icon={BarChart3} label="Orders" value={stats.total_orders ?? 0} description={`${stats.active_orders ?? 0} active • ${stats.completed_orders ?? 0} completed`} />
                <StatCard icon={CheckCircle2} label="Completion rate" value={percentLabel(stats.order_completion_rate)} description={`${stats.delivered_orders ?? 0} delivered • ${stats.disputed_orders ?? 0} disputed`} />
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-primary">Business health</h2>
              <div className="grid gap-5 xl:grid-cols-4">
                <StatCard icon={Clock} label="New users" value={stats.new_users_this_month ?? 0} description={`${stats.new_users_this_year ?? 0} joined this year`} href="/dashboard/admin/users" />
                <StatCard icon={IndianRupee} label="Total revenue" value={money(stats.total_revenue ?? 0)} description={`${money(stats.average_order_value ?? 0)} average order value`} />
                <StatCard icon={TrendingUp} label="Platform earnings" value={money(stats.platform_commission_this_month ?? 0)} description={`${money(stats.platform_commission_this_year ?? 0)} this year`} />
                <StatCard icon={TrendingUp} label="Quote acceptance" value={percentLabel(stats.quotation_acceptance_rate)} description={`${stats.rejected_quotations ?? 0} rejected quotations`} />
                <StatCard icon={BarChart3} label="Requirement conversion" value={percentLabel(stats.requirement_to_order_rate)} description={`${stats.pending_orders ?? 0} pending • ${stats.cancelled_orders ?? 0} cancelled orders`} />
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function AdminUsersPage() {
  const query = useApiQuery(queryKeys.adminUsers, adminService.users);
  const remove = useApiMutation(adminService.deleteUser, { successMessage: "User removed", invalidate: queryKeys.adminUsers });

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <DashboardShell role="ADMIN">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">User management</p>
            <h1 className="mt-1 text-3xl font-bold text-primary">Users</h1>
          </div>
        </div>

        <div className="grid gap-4">
          {query.isLoading ? <LoadingState /> : asArray(query.data).length ? asArray(query.data).map((user) => (
            <EntityCard
              key={user.id}
              title={user.full_name || user.email}
              subtitle={user.email}
              metadata={[
                { label: "Role", value: user.role },
                { label: "Active", value: user.is_active ? "Yes" : "No" },
                { label: "Created", value: dateLabel(user.created_at) },
              ]}
              actions={(
                <Button variant="destructive" size="sm" onClick={() => {
                  if (window.confirm(`Delete ${user.full_name ?? user.email}?`)) {
                    remove.mutate(user.id);
                  }
                }}>
                  <Trash2 className="mr-2 h-4 w-4" />Remove
                </Button>
              )}
            />
          )) : <EmptyState title="No users found" description="There are no user accounts to manage right now." />}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function AdminRequirementsPage() {
  const query = useApiQuery(queryKeys.adminRequirements, adminService.requirements);
  const remove = useApiMutation(adminService.deleteRequirement, { successMessage: "Requirement removed", invalidate: queryKeys.adminRequirements });

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <DashboardShell role="ADMIN">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Marketplace content</p>
            <h1 className="mt-1 text-3xl font-bold text-primary">Requirements</h1>
          </div>
        </div>

        <div className="grid gap-4">
          {query.isLoading ? <LoadingState /> : asArray(query.data).length ? asArray(query.data).map((requirement) => (
            <EntityCard
              key={requirement.id}
              title={requirement.title}
              subtitle={requirement.description}
              metadata={[
                { label: "Customer", value: requirement.customer_name || requirement.customer_email || "Unknown" },
                { label: "Budget", value: `₹${requirement.budget_min} - ₹${requirement.budget_max}` },
                { label: "Status", value: requirement.status },
              ]}
              actions={(
                <Button variant="destructive" size="sm" onClick={() => {
                  if (window.confirm(`Delete requirement ${requirement.title}?`)) {
                    remove.mutate(requirement.id);
                  }
                }}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete
                </Button>
              )}
            />
          )) : <EmptyState title="No requirements available" description="There are no marketplace requirements yet." />}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function AdminQuotationsPage() {
  const query = useApiQuery(queryKeys.adminQuotations, adminService.quotations);
  const remove = useApiMutation(adminService.deleteQuotation, { successMessage: "Quotation removed", invalidate: queryKeys.adminQuotations });

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <DashboardShell role="ADMIN">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Quotation oversight</p>
            <h1 className="mt-1 text-3xl font-bold text-primary">Quotations</h1>
          </div>
        </div>

        <div className="grid gap-4">
          {query.isLoading ? <LoadingState /> : asArray(query.data).length ? asArray(query.data).map((quotation) => (
            <EntityCard
              key={quotation.id}
              title={`₹${quotation.proposed_price} • ${quotation.status}`}
              subtitle={quotation.message?.substring(0, 100) + (quotation.message?.length > 100 ? "..." : "")}
              metadata={[
                { label: "Requirement", value: quotation.requirement_title || "Unknown" },
                { label: "Creator", value: quotation.creator_name || quotation.creator_id },
                { label: "Days", value: quotation.estimated_days },
              ]}
              actions={(
                <Button variant="destructive" size="sm" onClick={() => {
                  if (window.confirm(`Delete this quotation?`)) {
                    remove.mutate(quotation.id);
                  }
                }}>
                  <Trash2 className="mr-2 h-4 w-4" />Remove
                </Button>
              )}
            />
          )) : <EmptyState title="No quotations available" description="There are no quotations to review." />}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function AdminContactPage() {
  const query = useApiQuery(queryKeys.contactSubmissions, contactService.adminList);
  const update = useApiMutation(({ id, payload }) => contactService.adminUpdate(id, payload), {
    successMessage: "Contact item updated",
    invalidate: [queryKeys.contactSubmissions, queryKeys.adminStats],
  });
  const submissions = asArray(query.data);

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <DashboardShell role="ADMIN">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Support inbox</p>
            <h1 className="mt-1 text-3xl font-bold text-primary">Contact submissions</h1>
          </div>
        </div>

        <div className="grid gap-4">
          {query.isLoading ? <LoadingState /> : submissions.length ? submissions.map((submission) => (
            <EntityCard
              key={submission.id}
              title={`${submission.category.replaceAll("_", " ")} • ${submission.status}`}
              subtitle={submission.subject}
              metadata={[
                { label: "From", value: `${submission.name} (${submission.email})` },
                { label: "Message", value: submission.message },
                { label: "Order", value: submission.order_id ? <Link className="font-semibold text-primary hover:underline" href={`/orders/${submission.order_id}`}>{submission.order_id}</Link> : "Not linked" },
                { label: "Created", value: dateLabel(submission.created_at) },
              ]}
              actions={(
                <div className="flex flex-wrap gap-2">
                  {submission.status === "OPEN" ? (
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: submission.id, payload: { status: "IN_REVIEW" } })}>Review</Button>
                  ) : null}
                  {submission.status !== "RESOLVED" ? (
                    <Button size="sm" onClick={() => update.mutate({ id: submission.id, payload: { status: "RESOLVED" } })}>Resolve</Button>
                  ) : null}
                </div>
              )}
            />
          )) : <EmptyState title="No contact submissions" description="Feedback, complaints, and queries will appear here." />}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
