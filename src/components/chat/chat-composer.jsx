
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

const VOICE_BAR_GAINS = [0.7, 0.95, 1.15, 0.84, 1.3, 1, 0.76, 1.18, 0.9, 1.24, 0.8, 1.05, 0.68];

export function ChatComposer({ value, onChange, files, onFilesChange, onSubmit, onScreenshot, screenshotError, status, playSound }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceStateRef = useRef("idle");
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const meterFrameRef = useRef(null);
  const valueRef = useRef(value);
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceError, setVoiceError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => { valueRef.current = value; }, [value]);

  function updateVoiceState(nextState) {
    voiceStateRef.current = nextState;
    setVoiceState(nextState);
  }

  function stopVoiceMeter() {
    if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    audioContextRef.current = null;
    setVoiceLevel(0);
  }

  async function startVoiceMeter() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (voiceStateRef.current !== "listening") {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      await audioContext.resume();
      if (voiceStateRef.current !== "listening") {
        stream.getTracks().forEach((track) => track.stop());
        await audioContext.close();
        return;
      }
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const samples = new Uint8Array(analyser.fftSize);
      let lastPaintAt = 0;
      const updateMeter = (timestamp) => {
        if (!analyserRef.current) return;
        if (timestamp - lastPaintAt > 50) {
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length);
          setVoiceLevel(Math.min(1, Math.max(0, (rms - 0.018) * 7)));
          lastPaintAt = timestamp;
        }
        meterFrameRef.current = requestAnimationFrame(updateMeter);
      };
      meterFrameRef.current = requestAnimationFrame(updateMeter);
    } catch {
      // SpeechRecognition can still work when the visualizer stream is unavailable.
    }
  }

  function toggleVoice() {
    if (isBusy) return;
    if (voiceState === "listening") {
      updateVoiceState("stopping");
      stopVoiceMeter();
      recognitionRef.current?.stop();
      return;
    }
    if (voiceState === "stopping") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      updateVoiceState("error");
      setVoiceError("تبدیل گفتار در این مرورگر پشتیبانی نمی‌شود.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fa-IR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { setVoiceError(""); updateVoiceState("listening"); startVoiceMeter(); };
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
    recognition.onerror = () => { stopVoiceMeter(); updateVoiceState("error"); setVoiceError("دریافت صدا ممکن نشد. دوباره تلاش کنید."); };
    recognition.onend = () => { stopVoiceMeter(); updateVoiceState("idle"); setInterimTranscript(""); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    setInterimTranscript("");
    try {
      recognition.start();
    } catch {
      updateVoiceState("error");
      setVoiceError("شروع ضبط صدا ممکن نشد. دوباره تلاش کنید.");
      recognitionRef.current = null;
    }
  }

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
  }, [value]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close().catch(() => {});
  }, []);

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
      <div className={`chat-composer${voiceState === "listening" ? " is-listening" : ""}${voiceState === "stopping" ? " is-stopping" : ""}`}>
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          multiple
          accept="text/*,application/json,image/*,*/*"
          onChange={handleFiles}
          disabled={isBusy}
        />
        {!!files.length && <div className="chat-composer-attachments"><AttachmentList files={files} onRemove={(index) => onFilesChange(files.filter((_, i) => i !== index))} /></div>}
        <div className="chat-composer-row">
          <div className="chat-composer-field">
            {voiceState === "listening" || voiceState === "stopping" ? (
              <div className="chat-voice-mode" aria-live="polite" aria-busy={voiceState === "stopping"}>
                <div className="chat-voice-waveform" aria-hidden="true">
                  {VOICE_BAR_GAINS.map((gain, index) => (
                    <span
                      key={index}
                      className="chat-voice-bar"
                      style={{ transform: `scaleY(${Math.max(0.2, 0.22 + voiceLevel * gain)})` }}
                    />
                  ))}
                </div>
                <div className="chat-voice-copy">
                  <span className="chat-voice-label">{voiceState === "stopping" ? "در حال تبدیل صدا..." : "در حال گوش دادن..."}</span>
                  <span className="chat-voice-transcript">{interimTranscript || "برای پایان روی میکروفون بزنید"}</span>
                </div>
              </div>
            ) : (
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
            )}
          </div>
          <div className="chat-composer-actions">
            <div className="chat-composer-tools">
            <DropdownMenu dir="rtl">
              <TooltipProvider delayDuration={250}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" aria-label="افزودن فایل یا Screenshot" disabled={isBusy || voiceState !== "idle"}>
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
                  <Button type="button" className={`chat-mic-button${voiceState === "listening" ? " is-listening" : ""}`} variant={voiceState === "listening" ? "default" : "ghost"} size="icon" aria-label={voiceState === "listening" ? "توقف ضبط صدا" : "شروع ضبط صدا"} onClick={toggleVoice} disabled={isBusy || voiceState === "stopping"}>
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
              disabled={(!value.trim() && !files.length) || isBusy || voiceState !== "idle"}
            >
              {isBusy ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowUp size={16} />}
              <span>{isBusy ? "در حال دریافت" : "ارسال"}</span>
            </Button>
          </div>
        </div>
        {(voiceError || screenshotError) && <p className="chat-composer-error" role="status">{voiceError || screenshotError}</p>}
      </div>
      <p className="chat-composer-hint">با فشردن Enter ارسال می‌شود؛ برای خط جدید Shift + Enter را بزنید.</p>
    </div>
  );
}




