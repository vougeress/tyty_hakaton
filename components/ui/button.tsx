import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60",
        variant === "primary" && "bg-primary text-white shadow-card hover:bg-primary-strong",
        variant === "secondary" && "border border-border bg-surface text-ink hover:border-primary/35",
        variant === "ghost" && "text-ink hover:bg-muted",
        variant === "danger" && "bg-coral text-white hover:brightness-95",
        className
      )}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonProps["variant"];
};

export function ButtonLink({ className, variant = "primary", ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        variant === "primary" && "bg-primary text-white shadow-card hover:bg-primary-strong",
        variant === "secondary" && "border border-border bg-surface text-ink hover:border-primary/35",
        variant === "ghost" && "text-ink hover:bg-muted",
        variant === "danger" && "bg-coral text-white hover:brightness-95",
        className
      )}
      {...props}
    />
  );
}
