
import { History, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export function ChatHeader({ title, onOpenSettings, onOpenHistory }) {
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
          <p className="chat-current-title" title={title}>{title}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={250}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="باز کردن تاریخچه" onClick={onOpenHistory}>
                <History size={19} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تاریخچه</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="باز کردن تنظیمات" onClick={onOpenSettings}>
                <Settings2 size={19} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تنظیمات</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}




