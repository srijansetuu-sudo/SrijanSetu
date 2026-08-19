import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("surface rounded-lg transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_56px_rgba(31,44,119,0.14)]", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("border-b border-border p-5", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}
