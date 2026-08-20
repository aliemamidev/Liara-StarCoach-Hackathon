import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--chat-accent))] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--chat-accent))] text-white hover:bg-[hsl(var(--chat-accent-strong))]",
        secondary: "bg-[hsl(var(--chat-surface-muted))] text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-border))]",
        outline: "border border-[hsl(var(--chat-border))] bg-transparent text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-surface-muted))]",
        ghost: "text-[hsl(var(--chat-muted))] hover:bg-[hsl(var(--chat-surface-muted))] hover:text-[hsl(var(--chat-text))]",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        link: "text-[hsl(var(--chat-accent))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };







