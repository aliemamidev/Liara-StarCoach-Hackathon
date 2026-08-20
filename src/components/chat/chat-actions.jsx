import { AlertCircle, Check, Clipboard, RotateCcw, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChatActions({ content, onRetry, playSound }) {
  const [copied, setCopied] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("ready");
  const speechStatusRef = useRef("ready");
  const speechIdRef = useRef(`speech-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    function stopWhenAnotherMessageStarts(event) {
      if (event.detail !== speechIdRef.current) {
        speechStatusRef.current = "stopped";
        setSpeechStatus("stopped");
      }
    }

    window.addEventListener("chat:speech-start", stopWhenAnotherMessageStarts);
    return () => {
      window.removeEventListener("chat:speech-start", stopWhenAnotherMessageStarts);
      if (speechStatusRef.current === "reading") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  function updateSpeechStatus(status) {
    speechStatusRef.current = status;
    setSpeechStatus(status);
  }

  function speakMessage() {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      updateSpeechStatus("error");
      return;
    }

    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent("chat:speech-start", { detail: speechIdRef.current }));

    const utterance = new window.SpeechSynthesisUtterance(content);
    utterance.lang = "fa-IR";
    utterance.rate = 1;
    utterance.onend = () => updateSpeechStatus("stopped");
    utterance.onerror = () => updateSpeechStatus("error");
    updateSpeechStatus("reading");
    window.speechSynthesis.speak(utterance);
  }

  function handleSpeechClick() {
    if (speechStatus === "reading") {
      window.speechSynthesis?.cancel();
      updateSpeechStatus("stopped");
      return;
    }

    speakMessage();
  }

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
              className={`h-8 w-8 chat-speech-button${speechStatus === "reading" ? " is-reading" : ""}`}
              aria-label={
                speechStatus === "reading"
                  ? "توقف خواندن"
                  : speechStatus === "error"
                    ? "خطا در خواندن صوتی"
                    : speechStatus === "stopped"
                      ? "شروع دوباره خواندن"
                      : "خواندن پاسخ با صدا"
              }
              onClick={handleSpeechClick}
            >
              {speechStatus === "reading" ? <Square size={14} /> : speechStatus === "error" ? <AlertCircle size={15} /> : <Volume2 size={15} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {speechStatus === "reading"
              ? "توقف خواندن"
              : speechStatus === "error"
                ? "خواندن صوتی در این مرورگر در دسترس نیست"
                : speechStatus === "stopped"
                  ? "شروع دوباره خواندن"
                  : "خواندن با صدا"}
          </TooltipContent>
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





