
import { ArrowUp, ImagePlus, LoaderCircle, Mic, MicOff, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentList } from "@/components/ui/attachment";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export function ChatComposer({ value, onChange, files, onFilesChange, onSubmit, onScreenshot, screenshotError, status, playSound }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const valueRef = useRef(value);
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceError, setVoiceError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => { valueRef.current = value; }, [value]);

  function toggleVoice() {
    if (isBusy) return;
    if (voiceState === "listening") {
      recognitionRef.current?.stop();
      setVoiceState("stopping");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceState("error");
      setVoiceError("تبدیل گفتار در این مرورگر پشتیبانی نمی‌شود.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fa-IR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { setVoiceError(""); setVoiceState("listening"); };
    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += transcript;
        else interim += transcript;
      }
      setInterimTranscript(interim);
      if (finalText.trim()) onChange(`${valueRef.current}${valueRef.current.trim() ? " " : ""}${finalText.trim()}`);
    };
    recognition.onerror = () => { setVoiceState("error"); setVoiceError("دریافت صدا ممکن نشد. دوباره تلاش کنید."); };
    recognition.onend = () => { setVoiceState("idle"); setInterimTranscript(""); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
  }

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

        {interimTranscript && <p className="chat-voice-interim">{interimTranscript}</p>}
        {(voiceError || screenshotError) && <p className="chat-composer-error" role="status">{voiceError || screenshotError}</p>}
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-1">
            <DropdownMenu dir="rtl">
              <TooltipProvider delayDuration={250}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" aria-label="افزودن فایل یا Screenshot" disabled={isBusy || voiceState === "listening"}>
                        <Plus size={20} aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>افزودن</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                  <Upload size={16} aria-hidden="true" /> افزودن فایل
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onScreenshot}>
                  <ImagePlus size={16} aria-hidden="true" /> Screenshot
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant={voiceState === "listening" ? "default" : "ghost"} size="icon" aria-label={voiceState === "listening" ? "توقف ضبط صدا" : "شروع ضبط صدا"} onClick={toggleVoice} disabled={isBusy}>
                    {voiceState === "listening" ? <MicOff size={19} aria-hidden="true" /> : <Mic size={19} aria-hidden="true" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{voiceState === "listening" ? "توقف ضبط" : "ورودی صوتی"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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






