import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn("rounded-[8px] border border-border bg-surface p-4 shadow-card", className)}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border border-border bg-muted px-3 text-xs font-semibold text-ink",
        className
      )}
      {...props}
    />
  );
}
