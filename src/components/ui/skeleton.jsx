import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-lg bg-[hsl(var(--chat-surface-muted))]", className)} {...props} />;
}







