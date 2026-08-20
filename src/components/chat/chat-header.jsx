import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChatHeader({ onOpenSettings }) {
  return (
    <header className="chat-header">
      <div className="flex items-center gap-3">
        <img
          src="/static/logo.svg"
          alt="نشان لیارا"
          className="h-6 w-auto"
        />
        <div>
          <p className="text-sm font-bold text-[hsl(var(--chat-text))]">دستیار هوشمند لیارا</p>
          <p className="text-xs text-[hsl(var(--chat-muted))]">همراه شما برای پاسخ‌های فنی</p>
        </div>
      </div>
      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="باز کردن تنظیمات"
              onClick={onOpenSettings}
            >
              <Settings2 size={19} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>تنظیمات</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </header>
  );
}
