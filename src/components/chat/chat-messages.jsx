import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMessage } from "@/components/chat/chat-message";

export function ChatMessages({ messages, status, onRetry, playSound }) {
  const bottomRef = useRef(null);
  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  return (
    <ScrollArea className="chat-messages" aria-live="polite">
      <div className="chat-message-list">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            onRetry={onRetry}
            playSound={playSound}
            isStreaming={isStreaming && index === messages.length - 1 && message.role === "assistant"}
          />
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="chat-message chat-message-assistant" aria-label="در حال دریافت پاسخ">
            <div className="chat-message-label">دستیار لیارا</div>
            <div className="flex items-center gap-2 py-3">
              <Skeleton className="h-2 w-12" />
              <Skeleton className="h-2 w-20" />
              <Skeleton className="h-2 w-8" />
            </div>
          </div>
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </ScrollArea>
  );
}
