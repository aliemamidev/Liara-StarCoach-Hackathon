import React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full resize-none rounded-xl border border-[hsl(var(--chat-border))] bg-transparent px-4 py-3 text-sm leading-7 text-[hsl(var(--chat-text))] outline-none placeholder:text-[hsl(var(--chat-muted))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--chat-accent))] disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";







