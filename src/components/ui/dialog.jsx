import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogPortal({ children }) {
  return <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>;
}

export const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn("fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]", className)}
      {...props}
    />
  );
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName || "DialogOverlay";

export const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[hsl(var(--chat-border))] bg-[hsl(var(--chat-bg))] p-6 text-[hsl(var(--chat-text))] shadow-2xl",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl text-[hsl(var(--chat-muted))] hover:bg-[hsl(var(--chat-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--chat-accent))]">
          <X size={17} aria-hidden="true" />
          <span className="sr-only">بستن</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName || "DialogContent";

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-2 text-right", className)} {...props} />
);
export const DialogTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn("text-lg font-bold", className)} {...props} />
);
export const DialogDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description className={cn("text-sm leading-6 text-[hsl(var(--chat-muted))]", className)} {...props} />
);





