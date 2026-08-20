
import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { AlertCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatSettings } from "@/components/chat/chat-settings";

import { ChatHistory } from "@/components/chat/chat-history";
import { ScreenshotOverlay } from "@/components/chat/screenshot-overlay";
import { ScreenshotSourceDialog } from "@/components/chat/screenshot-source-dialog";
import { useUiSound } from "@/hooks/use-ui-sound";
import { useChatHistory } from "@/hooks/use-chat-history";

export function ChatLayout() {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [screenshotSourceOpen, setScreenshotSourceOpen] = useState(false);
  const [screenshotError, setScreenshotError] = useState("");
  const sound = useUiSound();
  const chatHistory = useChatHistory();
  const { hydrated, activeChatId, history, renameChat } = chatHistory;
  const activeChat = history.find((chat) => chat.id === activeChatId);
  const loadedChatRef = useRef(null);
  const titleRequestsRef = useRef(new Set());
  const liveResponseRef = useRef(false);
  const saveMessagesRef = useRef(chatHistory.saveMessages);
  saveMessagesRef.current = chatHistory.saveMessages;
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, setMessages, sendMessage, regenerate, status, error, clearError } = useChat({ transport });

  useEffect(() => {
    if (!chatHistory.hydrated) return;
    if (!chatHistory.activeChatId) {
      loadedChatRef.current = null;
      return;
    }
    if (loadedChatRef.current === chatHistory.activeChatId) return;
    const activeChat = chatHistory.history.find((chat) => chat.id === chatHistory.activeChatId);
    if (activeChat) {
      loadedChatRef.current = chatHistory.activeChatId;
      setMessages(activeChat.messages);
    }
  }, [chatHistory.hydrated, chatHistory.activeChatId, chatHistory.history, setMessages]);

  useEffect(() => {
    if (chatHistory.hydrated && status === "ready" && messages.length) saveMessagesRef.current(messages);
  }, [messages, status, chatHistory.hydrated]);

  useEffect(() => {
    if (!hydrated || status !== "ready" || !activeChatId || !messages.length) return;
    const chat = history.find((item) => item.id === activeChatId);
    if (!chat || chat.titleGenerated || titleRequestsRef.current.has(chat.id)) return;
    titleRequestsRef.current.add(chat.id);
    fetch("/api/chat-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => result?.title && renameChat(chat.id, result.title, { generated: true }))
      .catch(() => titleRequestsRef.current.delete(chat.id));
  }, [activeChatId, hydrated, history, messages, renameChat, status]);

  function submitMessage(value = input) {
    const trimmed = value.trim();
    if ((!trimmed && !files.length) || status === "submitted" || status === "streaming") return;
    liveResponseRef.current = true;
    sendMessage({ text: trimmed, files });
    setInput("");
    setFiles([]);
  }

  function retry() {
    clearError();
    regenerate();
  }


  function startNewChat() {
    titleRequestsRef.current.clear();
    liveResponseRef.current = false;
    chatHistory.setActiveChatId(null);
    setMessages([]);
    setFiles([]);
    setInput("");
    setHistoryOpen(false);
  }

  function selectChat(id) {
    const chat = chatHistory.history.find((item) => item.id === id);
    if (!chat) return;
    liveResponseRef.current = false;
    chatHistory.setActiveChatId(id);
    setMessages(chat.messages);
    setFiles([]);
    setInput("");
    setHistoryOpen(false);
  }

  function captureScreenshot(file) {
    setFiles((current) => [...current, file]);
    setScreenshotOpen(false);
    setScreenshotError("");
  }

  async function captureDisplayScreenshot(source) {
    setScreenshotSourceOpen(false);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenshotOpen(true);
      return;
    }

    let stream;
    try {
      const displaySurface = source === "window" ? "window" : source === "browser" ? "browser" : "monitor";
      stream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: { displaySurface },
        ...(source === "browser" ? { preferCurrentTab: true, selfBrowserSurface: "include" } : {}),
      });
      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error("screenshot-track-missing");
      const settings = track.getSettings();
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const canvas = document.createElement("canvas");
      canvas.width = settings.width || video.videoWidth;
      canvas.height = settings.height || video.videoHeight;
      if (!canvas.width || !canvas.height) throw new Error("screenshot-size-missing");
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("screenshot-empty");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      captureScreenshot(new File([blob], `screenshot-${timestamp}.png`, { type: "image/png" }));
    } catch (error) {
      if (error?.name !== "NotAllowedError" && error?.name !== "AbortError") {
        setScreenshotError("گرفتن تصویر از منبع انتخاب‌شده ممکن نشد. دوباره تلاش کنید.");
      }
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  function cancelScreenshot(message = "") {
    setScreenshotOpen(false);
    setScreenshotError(message);
  }

  return (
    <main className="chat-shell" dir="rtl">
      <ChatHeader
        title={activeChat?.title || "گفتگوی جدید"}
        onOpenSettings={() => {
          setSettingsOpen(true);
          sound.playSound("toggle");
        }}

        onOpenHistory={() => setHistoryOpen(true)}
      />
      <section className="chat-main">
        {messages.length === 0 ? (
          <ChatEmptyState onSuggestion={submitMessage} />
        ) : (
          <ChatMessages messages={messages} status={status} onRetry={retry} playSound={sound.playSound} isLive={liveResponseRef.current} />
        )}
        {error && (
          <div className="chat-error" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <span>اتصال برقرار نشد. دوباره تلاش کنید.</span>
            <Button variant="ghost" size="sm" onClick={retry}>تلاش دوباره</Button>
          </div>
        )}
      </section>
      <ChatComposer
        value={input}
        onChange={setInput}
        files={files}
        onFilesChange={setFiles}

        onScreenshot={() => { setScreenshotError(""); setScreenshotSourceOpen(true); }}
        screenshotError={screenshotError}
        onSubmit={() => submitMessage()}
        status={status}
        playSound={sound.playSound}
      />
      <Link href="/documentation" className="chat-docs-link">
        <BookOpen size={17} aria-hidden="true" />
        <span>مستندات اصلی</span>
      </Link>
      <ChatSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        soundEnabled={sound.enabled}
        onSoundChange={sound.setEnabled}
        playSound={sound.playSound}
      />

      <ChatHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={chatHistory.history}
        activeChatId={chatHistory.activeChatId}
        onSelect={selectChat}
        onNewChat={startNewChat}
        onRename={chatHistory.renameChat}
        onDelete={(id) => { if (window.confirm("این گفتگو حذف شود؟")) chatHistory.deleteChat(id); }}
      />
      <ScreenshotSourceDialog
        open={screenshotSourceOpen}
        onOpenChange={setScreenshotSourceOpen}
        onContinue={captureDisplayScreenshot}
      />
      {screenshotOpen && <ScreenshotOverlay onCapture={captureScreenshot} onCancel={cancelScreenshot} />}
    </main>
  );
}
