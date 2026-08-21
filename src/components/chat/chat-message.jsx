import { ChatActions } from "@/components/chat/chat-actions";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

function messageText(message) {
  return (message.parts || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

const markdownComponents = {
  a: ({ href = "", children, ...props }) => {
    const isExternal = /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        {...props}
        {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
};

export function ChatMessage({ message, onRetry, playSound, isStreaming, isLive, onScreenshot }) {
  const content = messageText(message);
  const isUser = message.role === "user";
  const attachments = (message.parts || []).filter((part) => part.type === "file" && part.url);
  const [displayedContent, setDisplayedContent] = useState(() => (isLive ? "" : content));
  const [isRevealing, setIsRevealing] = useState(isLive);
  const displayedContentRef = useRef(displayedContent);
  const targetContentRef = useRef(content);
  const frameRef = useRef(null);

  useEffect(() => {
    targetContentRef.current = content;
    if (!isLive) {
      displayedContentRef.current = content;
      setDisplayedContent(content);
      setIsRevealing(false);
      return undefined;
    }

    setIsRevealing(displayedContentRef.current !== content);
    let lastPaint = 0;
    const reveal = (timestamp) => {
      const current = displayedContentRef.current;
      const target = targetContentRef.current;
      if (current.length >= target.length) {
        setIsRevealing(false);
        frameRef.current = null;
        return;
      }
      if (timestamp - lastPaint >= 22) {
        const backlog = target.length - current.length;
        const step = Math.max(1, Math.min(5, Math.ceil(backlog / 18)));
        const next = target.slice(0, current.length + step);
        displayedContentRef.current = next;
        setDisplayedContent(next);
        lastPaint = timestamp;
      }
      frameRef.current = requestAnimationFrame(reveal);
    };
    frameRef.current = requestAnimationFrame(reveal);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [content, isLive]);

  const renderedContent = isLive ? displayedContent : content;
  const canUseActions = !isUser && renderedContent && (!isLive || (!isRevealing && renderedContent === content)) && !isStreaming;

  return (
    <article className={isUser ? "chat-message chat-message-user" : "chat-message chat-message-assistant"}>
      <div className="chat-message-label">{isUser ? "شما" : "لیا"}</div>
      <div className={`chat-message-content${isUser ? " chat-message-content-plain" : " chat-message-content-markdown"}`}>
        {renderedContent ? (
          isUser ? renderedContent : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {renderedContent}
            </ReactMarkdown>
          )
        ) : (isStreaming ? "" : "پاسخی دریافت نشد.")}
      </div>
      {!isUser && message.metadata?.liaAction === "screenshot" && onScreenshot && (
        <div className="mt-3 rounded-2xl border border-[hsl(var(--chat-accent)/.25)] bg-[hsl(var(--chat-accent)/.07)] p-3">
          <p className="text-xs leading-6 text-[hsl(var(--chat-text))]">{message.metadata.screenshotReason || "عکس از صفحه به تشخیص دقیق کمک می‌کند."}</p>
          <Button type="button" size="sm" className="mt-3 min-h-11" onClick={onScreenshot}>
            <ImagePlus size={16} aria-hidden="true" />
            عکس از صفحه
          </Button>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="chat-message-attachments">
          {attachments.map((attachment, index) => (
            <div className="chat-attachment-chip" key={`${attachment.url}-${index}`}>
              {attachment.mediaType?.startsWith("image/") ? <img src={attachment.url} alt={attachment.filename || "فایل پیوست"} className="chat-attachment-image" /> : null}
              <span className="max-w-40 truncate">{attachment.filename || "فایل پیوست"}</span>
            </div>
          ))}
        </div>
      )}
      {canUseActions && (
        <ChatActions content={renderedContent} onRetry={onRetry} playSound={playSound} />
      )}
    </article>
  );
}

export { messageText };



