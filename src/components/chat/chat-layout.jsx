
import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileListToFileUIParts, DefaultChatTransport } from "ai";
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
import { MAX_CHAT_FILES } from "@/lib/chat-message-validation.mjs";
import { canvasToJpegFile } from "@/lib/screenshot";

export function ChatLayout() {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [screenshotSourceOpen, setScreenshotSourceOpen] = useState(false);
  const [screenshotError, setScreenshotError] = useState("");
  const sound = useUiSound();
  const chatHistory = useChatHistory();
  const { hydrated, activeChatId, history, offline, renameChat } = chatHistory;
  const activeChat = history.find((chat) => chat.id === activeChatId);
  const loadedChatRef = useRef(null);
  const messagesViewportRef = useRef(null);
  const titleRequestsRef = useRef(new Set());
  const liveResponseRef = useRef(false);
  const statusRef = useRef("ready");
  const messagesRef = useRef([]);
  const saveMessagesRef = useRef(chatHistory.saveMessages);
  saveMessagesRef.current = chatHistory.saveMessages;
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat/" }), []);
  const { messages, setMessages, sendMessage, regenerate, status, error, clearError } = useChat({ transport });
  statusRef.current = status;
  messagesRef.current = messages;

  useEffect(() => {
    if (!chatHistory.hydrated) return;
    if (!chatHistory.activeChatId) {
      loadedChatRef.current = null;
      setMessages([]);
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
    const hasAssistantResponse = messages.some((message) => message.role === "assistant");
    if (
      !chat ||
      chat.titleGenerated ||
      titleRequestsRef.current.has(chat.id) ||
      !hasAssistantResponse
    ) return;
    titleRequestsRef.current.add(chat.id);
    fetch("/api/chat-title/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => result?.title && renameChat(chat.id, result.title, { generated: true }))
      .catch(() => {});
  }, [activeChatId, hydrated, history, messages, renameChat, status]);

  async function submitMessage(value = input) {
    const trimmed = value.trim();
    if ((!trimmed && !files.length) || status === "submitted" || status === "streaming") return;
    const chatId = activeChatId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!activeChatId) {
      loadedChatRef.current = chatId;
      chatHistory.setActiveChatId(chatId);
    }
    liveResponseRef.current = true;
    try {
      const transfer = new DataTransfer();
      files.slice(0, MAX_CHAT_FILES).forEach((file) => transfer.items.add(file));
      const fileParts = await convertFileListToFileUIParts(transfer.files);
      await sendMessage(trimmed ? { text: trimmed, files: fileParts } : { files: fileParts }, { body: { chatId } });
      setInput("");
      setFiles([]);
    } catch {
      liveResponseRef.current = false;
    }
  }

  useEffect(() => {
    if (!activeChatId) return undefined;
    let socket;
    let disposed = false;
    const refreshFromServer = async () => {
      if (disposed || statusRef.current === "submitted" || statusRef.current === "streaming") return;
      try {
        const response = await fetch("/api/chats/");
        if (!response.ok) return;
        const result = await response.json();
        const serverChat = (result.chats || []).find((chat) => chat.id === activeChatId);
        if (serverChat?.messages?.length > messagesRef.current.length) setMessages(serverChat.messages);
      } catch {
        // The regular chat persistence path remains the source of truth when realtime is unavailable.
      }
    };
    try {
      socket = new window.WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/realtime`);
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "chat.updated" && message.payload?.chatId === activeChatId) refreshFromServer();
        } catch {
          // Ignore malformed realtime events.
        }
      });
    } catch {
      socket = null;
    }
    const interval = window.setInterval(refreshFromServer, 8000);
    return () => {
      disposed = true;
      socket?.close();
      window.clearInterval(interval);
    };
  }, [activeChatId, setMessages]);

  function retry() {
    clearError();
    regenerate();
  }


  function startNewChat() {
    titleRequestsRef.current.clear();
    liveResponseRef.current = false;
    loadedChatRef.current = null;
    chatHistory.setActiveChatId(null);
    setMessages([]);
    setFiles([]);
    setInput("");
  }

  function selectChat(id) {
    const chat = chatHistory.history.find((item) => item.id === id);
    if (!chat) return;
    liveResponseRef.current = false;
    loadedChatRef.current = id;
    chatHistory.setActiveChatId(id);
    setMessages(chat.messages);
    setFiles([]);
    setInput("");
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
        ...(source === "browser" ? {
          preferCurrentTab: false,
          selfBrowserSurface: "include",
          surfaceSwitching: "include",
        } : {}),
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
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      captureScreenshot(await canvasToJpegFile(canvas, `screenshot-${timestamp}.jpg`));
    } catch (error) {
      if (error?.name !== "NotAllowedError" && error?.name !== "AbortError") {
        setScreenshotError(error?.message === "screenshot-too-large" ? "تصویر بزرگ‌تر از حد مجاز است؛ محدوده کوچک‌تری انتخاب کنید." : "گرفتن تصویر از منبع انتخاب‌شده ممکن نشد. دوباره تلاش کنید.");
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
      <div className="chat-topbar">
        <ChatHeader
          title={activeChat?.title || "گفتگوی جدید"}
          onOpenSettings={() => {
            setSettingsOpen(true);
            sound.playSound("toggle");
          }}
        />
        {offline && <div className="chat-persistence-banner" role="status">اتصال ذخیره‌سازی برقرار نیست؛ نمایش فعلی موقت است و پس از بازگشت اتصال همگام می‌شود.</div>}
      </div>
      <div className="chat-workspace">
        <section ref={messagesViewportRef} className="chat-main">
        {messages.length === 0 ? (
          <ChatEmptyState onSuggestion={submitMessage} />
        ) : (
          <ChatMessages
            key={activeChatId || "new-chat"}
            messages={messages}
            status={status}
            onRetry={retry}
            playSound={sound.playSound}
            isLive={liveResponseRef.current}
            scrollContainerRef={messagesViewportRef}
            onScreenshot={() => { setScreenshotError(""); setScreenshotSourceOpen(true); }}
            onContactSubmit={(name, phone) => submitMessage(`نام و نام خانوادگی: ${name}\nشماره تماس: ${phone}`)}
          />
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
        <ChatHistory
          history={chatHistory.history}
          activeChatId={chatHistory.activeChatId}
          onSelect={selectChat}
          onNewChat={startNewChat}
          onRename={chatHistory.renameChat}
          onDelete={(id) => { if (window.confirm("این گفتگو حذف شود؟")) chatHistory.deleteChat(id); }}
        />
      </div>
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

      <ScreenshotSourceDialog
        open={screenshotSourceOpen}
        onOpenChange={setScreenshotSourceOpen}
        onContinue={captureDisplayScreenshot}
      />
      {screenshotOpen && <ScreenshotOverlay onCapture={captureScreenshot} onCancel={cancelScreenshot} />}
    </main>
  );
}
