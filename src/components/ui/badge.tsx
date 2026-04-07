import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  verified: "border-secondary/20 bg-badge-verified-bg text-badge-verified-fg",
  pending: "border-warning/25 bg-warning/12 text-warning",
  secondary: "border-border bg-surface-3 text-muted-foreground",
  destructive: "border-destructive/25 bg-destructive/12 text-destructive",
} as const;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof badgeVariants;
};

export function Badge({
  className,
  variant = "secondary",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em]",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
