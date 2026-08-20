import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-xl border border-[hsl(var(--chat-border))] bg-white px-3 py-2 text-sm text-[hsl(var(--chat-text))] outline-none transition placeholder:text-[hsl(var(--chat-muted))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--chat-accent))] disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
