import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMessage } from "@/components/chat/chat-message";

export function ChatMessages({ messages, status, onRetry, playSound, isLive = false }) {
  const viewportRef = useRef(null);
  const bottomRef = useRef(null);
  const previousMessageCountRef = useRef(messages.length);
  const pinnedToBottomRef = useRef(true);
  const liveMessageIdRef = useRef(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const isStreaming = status === "submitted" || status === "streaming";

  function scrollToBottom(behavior = "auto") {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }

  function handleViewportScroll() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const pinned = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 96;
    pinnedToBottomRef.current = pinned;
    setShowJumpToLatest(!pinned);
  }

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const hasNewMessage = messages.length > previousMessageCountRef.current;
    if (hasNewMessage && lastMessage?.role === "user") {
      pinnedToBottomRef.current = true;
      setShowJumpToLatest(false);
      scrollToBottom();
    } else if (pinnedToBottomRef.current) {
      scrollToBottom();
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, status]);

  if ((isStreaming || isLive) && messages[messages.length - 1]?.role === "assistant") {
    liveMessageIdRef.current = messages[messages.length - 1].id;
  }

  return (
    <div className="chat-messages-wrap">
      <ScrollArea
        className="chat-messages"
        viewportRef={viewportRef}
        onViewportScroll={handleViewportScroll}
        aria-live="polite"
      >
      <div className="chat-message-list">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            onRetry={onRetry}
            playSound={playSound}
            isStreaming={isStreaming && index === messages.length - 1 && message.role === "assistant"}
            isLive={liveMessageIdRef.current === message.id}
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
      {showJumpToLatest && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="chat-jump-to-latest"
          onClick={() => {
            pinnedToBottomRef.current = true;
            setShowJumpToLatest(false);
            scrollToBottom();
          }}
        >
          <ArrowDown size={15} aria-hidden="true" />
          آخرین پاسخ
        </Button>
      )}
    </div>
  );
}





