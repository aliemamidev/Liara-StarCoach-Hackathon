import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const ScrollArea = forwardRef(function ScrollArea({ className, viewportRef, onViewportScroll, children, ...props }, ref) {
  return (
    <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport ref={viewportRef} onScroll={onViewportScroll} className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar orientation="vertical" className="flex w-2 touch-none select-none p-0.5">
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-[hsl(var(--chat-border))]" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});






