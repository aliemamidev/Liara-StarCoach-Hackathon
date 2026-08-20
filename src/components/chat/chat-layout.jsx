
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
import { useUiSound } from "@/hooks/use-ui-sound";
import { useChatHistory } from "@/hooks/use-chat-history";

export function ChatLayout() {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [screenshotError, setScreenshotError] = useState("");
  const sound = useUiSound();
  const chatHistory = useChatHistory();
  const loadedChatRef = useRef(null);
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

  function submitMessage(value = input) {
    const trimmed = value.trim();
    if ((!trimmed && !files.length) || status === "submitted" || status === "streaming") return;
    sendMessage({ text: trimmed, files });
    setInput("");
    setFiles([]);
  }

  function retry() {
    clearError();
    regenerate();
  }


  function startNewChat() {
    chatHistory.setActiveChatId(null);
    setMessages([]);
    setFiles([]);
    setInput("");
    setHistoryOpen(false);
  }

  function selectChat(id) {
    const chat = chatHistory.history.find((item) => item.id === id);
    if (!chat) return;
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

  function cancelScreenshot(message = "") {
    setScreenshotOpen(false);
    setScreenshotError(message);
  }

  return (
    <main className="chat-shell" dir="rtl">
      <ChatHeader
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
          <ChatMessages messages={messages} status={status} onRetry={retry} playSound={sound.playSound} />
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

        onScreenshot={() => { setScreenshotError(""); setScreenshotOpen(true); }}
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
        onDelete={(id) => { if (window.confirm("این گفتگو حذف شود؟")) chatHistory.deleteChat(id); }}
      />
      {screenshotOpen && <ScreenshotOverlay onCapture={captureScreenshot} onCancel={cancelScreenshot} />}
    </main>
  );
}




