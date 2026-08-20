import { Check, Clipboard, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChatActions({ content, onRetry, playSound }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      playSound("success");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="mt-3 flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={copied ? "کپی شد" : "کپی پاسخ"}
              onClick={handleCopy}
            >
              {copied ? <Check size={15} /> : <Clipboard size={15} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "کپی شد" : "کپی"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="تلاش دوباره"
              onClick={onRetry}
            >
              <RotateCcw size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>تلاش دوباره</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}







