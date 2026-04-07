import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitive.List>;
type TabsTriggerProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>;
type TabsContentProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Content>;

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-11 items-center rounded-md border border-border bg-surface-2 p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex min-w-[7rem] items-center justify-center rounded-sm px-3 py-2 text-sm font-medium transition duration-base ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-focus-ring-offset data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "mt-4 rounded-md border border-border bg-surface p-4 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
