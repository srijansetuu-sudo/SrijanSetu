import { cn } from "@/lib/utils";

export function Badge({ className, variant = "muted", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        variant === "muted" && "bg-muted text-muted-foreground",
        variant === "accent" && "bg-accent text-accent-foreground",
        variant === "primary" && "bg-primary text-white",
        className
      )}
      {...props}
    />
  );
}
