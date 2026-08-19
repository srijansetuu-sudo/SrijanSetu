import Link from "next/link";
import { CalendarDays, IndianRupee, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dateLabel, money } from "@/lib/utils";

export function CreatorCard({ creator }) {
  const id = creator.id ?? creator.creator_profile_id ?? creator.profile_id;
  const categories = creator.categories ?? creator.creator_categories ?? [];
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-accent via-[#ffe66d] to-primary" />
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-bold text-primary">{creator.brand_name ?? creator.full_name ?? "Artist"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{creator.headline ?? "Painter, maker, or artisan sharing handmade work"}</p>
          </div>
          <Badge variant="accent">{creator.years_of_experience ?? 0}+ yrs</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.slice(0, 4).map((cat, index) => <Badge key={cat.id ?? cat.category_name ?? index}>{cat.category_name ?? cat}</Badge>)}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"><Star className="h-4 w-4 fill-accent text-accent" />{creator.average_rating ?? "New"}</span>
          <Button asChild="true" variant="outline" size="sm"><Link href={`/creators/${id}`}>View profile</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RequirementCard({ requirement, href, actionLabel = "View requirement" }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-primary via-[#4050a5] to-accent" />
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-primary">{requirement.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{requirement.description}</p>
          </div>
          <Badge variant="primary">{requirement.status ?? "OPEN"}</Badge>
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-muted-foreground">
          <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4" />{money(requirement.budget_min)} - {money(requirement.budget_max)}</span>
          <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{dateLabel(requirement.deadline)}</span>
        </div>
        <Button asChild="true" className="mt-5" variant="outline" size="sm"><Link href={href ?? `/requirements/${requirement.id}`}>{actionLabel}</Link></Button>
      </CardContent>
    </Card>
  );
}

export function QuotationCard({ quotation, onAccept, onReject, onDelete }) {
  const statusLabel = quotation.order_status === "PENDING" ? "PAYMENT PENDING" : quotation.status;
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-primary">{money(quotation.proposed_price)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{quotation.estimated_days} days</p>
            <p className="mt-1 text-sm text-muted-foreground">{quotation.revisions_allowed ?? 0} revisions</p>
          </div>
          <Badge>{statusLabel}</Badge>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{quotation.message}</p>
        {onAccept ? (
          <div className="mt-4 rounded-lg border border-border bg-muted/60 p-3 text-sm">
            <p className="font-semibold text-primary">Workspace starts after paying the full quoted amount upfront.</p>
            <p className="mt-1 text-muted-foreground">The amount stays with SrijanSetu until the project is completed.</p>
          </div>
        ) : null}
        {(onAccept || onReject || onDelete) ? (
          <div className="mt-5 flex gap-2">
            {onAccept ? <Button size="sm" onClick={onAccept}>Accept and pay {money(quotation.proposed_price)}</Button> : null}
            {onReject ? <Button size="sm" variant="outline" onClick={onReject}>Reject</Button> : null}
            {onDelete ? <Button size="sm" variant="outline" onClick={onDelete}>Delete</Button> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function NotificationCard({ notification, onRead }) {
  const href = notification.action_url || "/notifications";
  const unreadClass = notification.is_read ? "bg-background" : "border-primary/20 bg-primary/5";
  const handleClick = async (event) => {
    if (notification.is_read || !onRead) return;
    event.preventDefault();
    await onRead();
    window.location.href = href;
  };
  return (
    <Link href={href} onClick={handleClick}>
      <Card className={`${unreadClass} transition-colors hover:bg-muted/70`}>
        <CardContent className="flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-primary">{notification.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
          </div>
          {!notification.is_read ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label="Unread" /> : null}
        </CardContent>
      </Card>
    </Link>
  );
}

export function CompactNotificationCard({ notification, onRead }) {
  const href = notification.action_url || "/notifications";
  const handleClick = async (event) => {
    if (notification.is_read || !onRead) return;
    event.preventDefault();
    await onRead();
    window.location.href = href;
  };
  return (
    <Link href={href} onClick={handleClick} className={`block rounded-md px-3 py-2 text-sm transition-colors ${notification.is_read ? "hover:bg-muted" : "bg-primary/5 hover:bg-primary/10"}`}>
      <div className="flex items-start gap-2">
        {!notification.is_read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" /> : null}
        <div className="min-w-0">
          <p className="truncate font-semibold text-primary">{notification.title}</p>
          <p className="mt-0.5 line-clamp-2 text-muted-foreground">{notification.body}</p>
        </div>
      </div>
    </Link>
  );
}

export function ReviewCard({ review }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-1 text-accent">{Array.from({ length: review.rating ?? 0 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-accent" />)}</div>
        <p className="mt-3 text-sm text-muted-foreground">{review.comment ?? "No comment added."}</p>
      </CardContent>
    </Card>
  );
}
