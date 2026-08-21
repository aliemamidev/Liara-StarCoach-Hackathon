import { AlertCircle, Check, Clipboard, LoaderCircle, RotateCcw, Square, Volume2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function splitSpeech(text) {
  const sentences = text.match(/[^.!?؟؛\n]+[.!?؟؛\n]*/g) || [text];
  const chunks = [];
  sentences.forEach((sentence) => {
    for (let index = 0; index < sentence.length; index += 3500) {
      chunks.push(sentence.slice(index, index + 3500).trim());
    }
  });
  return chunks.filter(Boolean);
}

export function ChatActions({ content, onRetry, playSound }) {
  const [copied, setCopied] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("ready");
  const speechStatusRef = useRef("ready");
  const speechId = useId();
  const speechRequestRef = useRef(0);
  const abortControllerRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    function stopWhenAnotherMessageStarts(event) {
      if (event.detail === speechId) return;
      speechRequestRef.current += 1;
      abortControllerRef.current?.abort();
      audioRef.current?.pause();
      audioRef.current = null;
      setSpeechStatus("stopped");
      speechStatusRef.current = "stopped";
    }

    window.addEventListener("chat:speech-start", stopWhenAnotherMessageStarts);
    return () => {
      window.removeEventListener("chat:speech-start", stopWhenAnotherMessageStarts);
      speechRequestRef.current += 1;
      abortControllerRef.current?.abort();
      audioRef.current?.pause();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, [speechId]);

  function updateSpeechStatus(status) {
    speechStatusRef.current = status;
    setSpeechStatus(status);
  }

  function stopSpeech() {
    speechRequestRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    updateSpeechStatus("stopped");
  }

  function waitForAudio(audio, requestId) {
    return new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = () => reject(new Error("audio-playback-failed"));
      if (speechRequestRef.current !== requestId) {
        reject(new DOMException("Speech request was cancelled", "AbortError"));
        return;
      }
      audio.play().catch(reject);
    });
  }

  async function speakMessage() {
    stopSpeech();
    const requestId = speechRequestRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    window.dispatchEvent(new CustomEvent("chat:speech-start", { detail: speechId }));
    updateSpeechStatus("preparing");

    try {
      for (const chunk of splitSpeech(content)) {
        if (speechRequestRef.current !== requestId) return;
        const response = await fetch("/api/chat-speech/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunk }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("speech-api-failed");
        const url = URL.createObjectURL(await response.blob());
        objectUrlsRef.current.add(url);
        const audio = new Audio(url);
        audio.preload = "auto";
        audioRef.current = audio;
        updateSpeechStatus("reading");
        await waitForAudio(audio, requestId);
        URL.revokeObjectURL(url);
        objectUrlsRef.current.delete(url);
        audioRef.current = null;
      }
      if (speechRequestRef.current === requestId) updateSpeechStatus("stopped");
    } catch (error) {
      if (error?.name !== "AbortError" && speechRequestRef.current === requestId) updateSpeechStatus("error");
    } finally {
      if (speechRequestRef.current === requestId) abortControllerRef.current = null;
    }
  }

  function handleSpeechClick() {
    if (speechStatus === "reading" || speechStatus === "preparing") stopSpeech();
    else speakMessage();
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

  const speechLabel = speechStatus === "preparing"
    ? "در حال آماده‌سازی صدا..."
    : speechStatus === "reading"
      ? "در حال خواندن پاسخ..."
      : speechStatus === "error"
        ? "تبدیل متن به صدا ممکن نشد"
        : "صدای تولیدشده با هوش مصنوعی";

  return (
    <TooltipProvider delayDuration={250}>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={copied ? "کپی شد" : "کپی پاسخ"} onClick={handleCopy}>
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
              aria-label={speechStatus === "reading" || speechStatus === "preparing" ? "توقف خواندن" : "خواندن پاسخ با صدا"}
              onClick={handleSpeechClick}
            >
              {speechStatus === "preparing" ? <LoaderCircle className="animate-spin" size={15} /> : speechStatus === "reading" ? <Square size={14} /> : speechStatus === "error" ? <AlertCircle size={15} /> : <Volume2 size={15} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{speechLabel}</TooltipContent>
        </Tooltip>
        <span className={`chat-speech-status${speechStatus === "error" ? " is-error" : ""}`} role="status">{speechLabel}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="تلاش دوباره" onClick={onRetry}>
              <RotateCcw size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>تلاش دوباره</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
