import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  primary:
    "border-primary/25 bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
  secondary: "border-border bg-surface-2 text-foreground hover:bg-surface-3",
  ghost:
    "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground",
  destructive:
    "border-destructive/30 bg-destructive/12 text-destructive hover:bg-destructive/18",
} as const;

const buttonSizes = {
  sm: "h-8 px-3 text-[10px]",
  md: "h-10 px-4 text-[11px]",
  lg: "h-11 px-5 text-[11px]",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: keyof typeof buttonSizes;
  variant?: keyof typeof buttonVariants;
};

export function Button({
  asChild = false,
  className,
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-mono font-semibold uppercase tracking-[0.18em] transition-colors duration-base ease-standard focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-focus-ring-offset disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}
