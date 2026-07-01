import { Loader2, Search } from "lucide-react";

export function LoadingState({ label = "Loading" }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-border bg-muted/60 p-8 text-center">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description = "New activity will appear here." }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-border bg-muted/60 p-8 text-center">
      <div>
        <Search className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-semibold text-primary">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
