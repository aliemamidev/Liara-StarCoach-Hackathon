import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({ side = "right", className, children, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(24rem,calc(100%-1rem))] flex-col border-[hsl(var(--chat-border))] bg-[hsl(var(--chat-bg))] p-6 text-[hsl(var(--chat-text))] shadow-2xl",
          side === "right" ? "right-0 border-r" : "left-0 border-l",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute left-4 top-4 rounded-lg p-2 text-[hsl(var(--chat-muted))] hover:bg-[hsl(var(--chat-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--chat-accent))]">
          <X size={17} aria-hidden="true" />
          <span className="sr-only">بستن</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-2 text-right", className)} {...props} />
);
export const SheetTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn("text-lg font-bold", className)} {...props} />
);
export const SheetDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description className={cn("text-sm leading-6 text-[hsl(var(--chat-muted))]", className)} {...props} />
);







