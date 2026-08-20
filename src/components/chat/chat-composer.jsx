import { ArrowUp, ImagePlus, LoaderCircle, Plus, Upload } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChatComposer({ value, onChange, onSubmit, status, playSound }) {
  const textareaRef = useRef(null);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
  }, [value]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function submit() {
    if (!value.trim() || isBusy) return;
    playSound("pulse");
    onSubmit();
  }

  return (
    <div className="chat-composer-wrap">
      <div className="chat-composer">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="پیام خود را بنویسید..."
          aria-label="پیام خود را بنویسید"
          rows={1}
          maxLength={20000}
          disabled={isBusy}
        />
        <div className="flex items-center justify-between gap-2 pt-2">
          <DropdownMenu dir="rtl">
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="گزینه‌های افزودن">
                      <Plus size={20} aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>گزینه‌های بیشتر</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled>
                <Upload size={16} aria-hidden="true" /> افزودن فایل
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <ImagePlus size={16} aria-hidden="true" /> افزودن تصویر
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Plus size={16} aria-hidden="true" /> گرفتن تصویر صفحه
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            size="sm"
            className="min-w-24"
            onClick={submit}
            disabled={!value.trim() || isBusy}
          >
            {isBusy ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowUp size={16} />}
            <span>{isBusy ? "در حال دریافت" : "ارسال"}</span>
          </Button>
        </div>
      </div>
      <p className="chat-composer-hint">با فشردن Enter ارسال می‌شود؛ برای خط جدید Shift + Enter را بزنید.</p>
    </div>
  );
}
