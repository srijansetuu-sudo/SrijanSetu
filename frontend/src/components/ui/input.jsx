import { cn } from "@/lib/utils";

export function Input({ className, ...props }) {
  return <input className={cn("h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4", className)} {...props} />;
}
