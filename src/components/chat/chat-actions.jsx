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
  const speechRequestRef = useRef(0);

  useEffect(() => {
    function stopWhenAnotherMessageStarts(event) {
      if (event.detail !== speechIdRef.current) {
        speechRequestRef.current += 1;
        window.speechSynthesis?.cancel();
        speechStatusRef.current = "stopped";
        setSpeechStatus("stopped");
      }
    }

    window.addEventListener("chat:speech-start", stopWhenAnotherMessageStarts);
    return () => {
      window.removeEventListener("chat:speech-start", stopWhenAnotherMessageStarts);
      speechRequestRef.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  function updateSpeechStatus(status) {
    speechStatusRef.current = status;
    setSpeechStatus(status);
  }

  function waitForVoices() {
    const currentVoices = window.speechSynthesis.getVoices();
    if (currentVoices.length) return Promise.resolve(currentVoices);
    return new Promise((resolve) => {
      const finish = () => {
        window.clearTimeout(timeout);
        window.speechSynthesis.removeEventListener("voiceschanged", finish);
        resolve(window.speechSynthesis.getVoices());
      };
      const timeout = window.setTimeout(finish, 700);
      window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    });
  }

  function splitSpeech(text) {
    const sentences = text.match(/[^.!?؟؛\n]+[.!?؟؛\n]*/g) || [text];
    const chunks = [];
    sentences.forEach((sentence) => {
      for (let index = 0; index < sentence.length; index += 220) chunks.push(sentence.slice(index, index + 220));
    });
    return chunks.filter(Boolean);
  }

  async function speakMessage() {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      updateSpeechStatus("error");
      return;
    }

    const requestId = speechRequestRef.current + 1;
    speechRequestRef.current = requestId;
    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent("chat:speech-start", { detail: speechIdRef.current }));
    const voices = await waitForVoices();
    if (speechRequestRef.current !== requestId) return;
    const voice = voices.find((item) => item.lang.toLowerCase() === "fa-ir")
      || voices.find((item) => item.lang.toLowerCase().startsWith("fa"));
    if (!voice) {
      updateSpeechStatus("error");
      return;
    }
    const chunks = splitSpeech(content);
    let index = 0;
    const speakNext = () => {
      if (speechRequestRef.current !== requestId) return;
      if (index >= chunks.length) {
        updateSpeechStatus("stopped");
        return;
      }
      const utterance = new window.SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = voice.lang;
      utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = () => { index += 1; speakNext(); };
      utterance.onerror = () => {
        if (speechRequestRef.current === requestId) updateSpeechStatus("error");
      };
      window.speechSynthesis.speak(utterance);
    };
    updateSpeechStatus("reading");
    speakNext();
  }

  function handleSpeechClick() {
    if (speechStatus === "reading") {
      speechRequestRef.current += 1;
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
        {speechStatus === "error" && (
          <span className="chat-speech-error" role="status">
            صدای فارسی روی این دستگاه نصب یا فعال نیست
          </span>
        )}
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
                    ? "صدای فارسی در مرورگر پیدا نشد"
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
                ? "صدای فارسی روی این دستگاه نصب یا فعال نیست"
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



