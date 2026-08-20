import { ArrowUp, LoaderCircle, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentList } from "@/components/ui/attachment";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChatComposer({ value, onChange, files, onFilesChange, onSubmit, status, playSound }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
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
    if ((!value.trim() && !files.length) || isBusy) return;
    playSound("pulse");
    onSubmit();
  }

  function handleFiles(event) {
    const selected = Array.from(event.target.files || []);
    if (selected.length) onFilesChange([...files, ...selected]);
    event.target.value = "";
  }

  return (
    <div className="chat-composer-wrap">
      <div className="chat-composer">
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          multiple
          accept="text/*,application/json,image/*,*/*"
          onChange={handleFiles}
          disabled={isBusy}
        />
        <AttachmentList files={files} onRemove={(index) => onFilesChange(files.filter((_, i) => i !== index))} />
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
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="افزودن فایل" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
                  <Plus size={20} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>افزودن فایل</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            type="button"
            size="sm"
            className="min-w-24"
            onClick={submit}
            disabled={(!value.trim() && !files.length) || isBusy}
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
