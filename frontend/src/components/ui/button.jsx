"use client";

import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", size = "md", ...props }) {
  const { asChild, children, ...rest } = props;
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50",
    size === "sm" && "h-9 px-3 text-sm",
    size === "md" && "h-11 px-5 text-sm",
    size === "lg" && "h-12 px-6",
    variant === "primary" && "bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(31,44,119,0.18)] hover:-translate-y-0.5 hover:bg-[#18245f]",
    variant === "accent" && "bg-accent text-accent-foreground shadow-[0_12px_24px_rgba(255,213,0,0.22)] hover:-translate-y-0.5 hover:bg-[#f1c900]",
    variant === "outline" && "border border-border bg-white text-primary shadow-sm hover:-translate-y-0.5 hover:bg-muted",
    variant === "ghost" && "text-primary hover:bg-muted",
    className
  );
  if (asChild && children) {
    if (isValidElement(children)) {
      return cloneElement(children, { className: cn(classes, children.props.className) });
    }
    return <span className={classes}>{children}</span>;
  }
  return (
    <button
      className={classes}
      {...rest}
    >
      {children}
    </button>
  );
}
