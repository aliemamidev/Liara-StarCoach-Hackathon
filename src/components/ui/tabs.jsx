import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }) {
  return <TabsPrimitive.List className={cn("inline-flex h-10 items-center justify-center rounded-xl bg-[hsl(var(--chat-surface-muted))] p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }) {
  return <TabsPrimitive.Trigger className={cn("inline-flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-[hsl(var(--chat-muted))] transition data-[state=active]:bg-[hsl(var(--chat-surface))] data-[state=active]:text-[hsl(var(--chat-text))] data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--chat-accent))]", className)} {...props} />;
}

export function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content className={cn("mt-4 focus-visible:outline-none", className)} {...props} />;
}
