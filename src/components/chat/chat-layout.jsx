import { useMemo, useState } from "react";
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
import { useUiSound } from "@/hooks/use-ui-sound";

export function ChatLayout() {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sound = useUiSound();
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, regenerate, status, error, clearError } = useChat({ transport });

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

  return (
    <main className="chat-shell" dir="rtl">
      <ChatHeader
        onOpenSettings={() => {
          setSettingsOpen(true);
          sound.playSound("toggle");
        }}
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
    </main>
  );
}
