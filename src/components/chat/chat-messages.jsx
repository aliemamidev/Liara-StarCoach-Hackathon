import { ArrowDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMessage } from "@/components/chat/chat-message";

export function ChatMessages({ messages, status, onRetry, playSound, isLive = false, scrollContainerRef }) {
  const previousMessageCountRef = useRef(messages.length);
  const pinnedToBottomRef = useRef(true);
  const liveMessageIdRef = useRef(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const isStreaming = status === "submitted" || status === "streaming";

  const scrollToBottom = useCallback((behavior = "auto") => {
    const viewport = scrollContainerRef?.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, [scrollContainerRef]);

  const handleViewportScroll = useCallback(() => {
    const viewport = scrollContainerRef?.current;
    if (!viewport) return;
    const pinned = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 96;
    pinnedToBottomRef.current = pinned;
    setShowJumpToLatest(!pinned);
  }, [scrollContainerRef]);

  useEffect(() => {
    const viewport = scrollContainerRef?.current;
    if (!viewport) return undefined;
    viewport.addEventListener("scroll", handleViewportScroll, { passive: true });
    handleViewportScroll();
    return () => viewport.removeEventListener("scroll", handleViewportScroll);
  }, [handleViewportScroll, scrollContainerRef]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const hasNewMessage = messages.length > previousMessageCountRef.current;
    if (hasNewMessage && lastMessage?.role === "user") {
      pinnedToBottomRef.current = true;
      setShowJumpToLatest(false);
      requestAnimationFrame(() => scrollToBottom());
    } else if (pinnedToBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom());
    }
    previousMessageCountRef.current = messages.length;
  }, [isLive, messages, scrollToBottom, status]);

  if ((isStreaming || isLive) && messages[messages.length - 1]?.role === "assistant") {
    liveMessageIdRef.current = messages[messages.length - 1].id;
  }

  return (
    <div className="chat-messages-wrap">
      <div className="chat-messages" aria-live="polite">
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
            <div className="chat-message-label">لیا</div>
            <div className="flex items-center gap-2 py-3">
              <Skeleton className="h-2 w-12" />
              <Skeleton className="h-2 w-20" />
              <Skeleton className="h-2 w-8" />
            </div>
          </div>
        )}
        </div>
      </div>
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

