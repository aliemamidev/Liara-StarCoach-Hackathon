import { ChatActions } from "@/components/chat/chat-actions";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkPreviewCard } from "@/components/link-preview-card";

function messageText(message) {
  return (message.parts || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function formatMessageTime(createdAt) {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const markdownComponents = {
  a: ({ href = "", children }) => <LinkPreviewCard href={href}>{children}</LinkPreviewCard>,
};

export function LiaIdentity() {
  return <div className="chat-message-identity"><span className="chat-message-avatar"><Image src="/static/images/lia-avatar.png" alt="آواتار لیا" width={48} height={48} /></span><span><strong>لیا</strong><small>دستیار لیارا</small></span></div>;
}

function ContactForm({ onSubmit, disabled }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) return setError("نام و نام خانوادگی را وارد کنید.");
    if (!/^(?:\+98|98|0)?9\d{9}$/.test(cleanPhone.replace(/[\s()-]/g, ""))) return setError("شماره تماس معتبر وارد کنید.");
    setError("");
    onSubmit(cleanName, cleanPhone);
  }

  return <form className="chat-contact-form" onSubmit={submit} aria-label="اطلاعات تماس برای ارجاع به ادمین">
    <div className="chat-contact-fields">
      <label>نام و نام خانوادگی<input value={name} onChange={(event) => setName(event.target.value)} disabled={disabled} autoComplete="name" /></label>
      <label>شماره تماس<input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={disabled} inputMode="tel" autoComplete="tel" dir="ltr" /></label>
    </div>
    {error && <p className="chat-contact-error" role="alert">{error}</p>}
    <Button type="submit" className="mt-3 min-h-11" disabled={disabled}>ثبت و ارسال</Button>
  </form>;
}

export function ChatMessage({ message, onRetry, playSound, isStreaming, isLive, onScreenshot, onContactSubmit, showContactForm }) {
  const content = messageText(message);
  const isUser = message.role === "user";
  const isAdminAnswer = message.metadata?.liaStage === "admin_answer";
  const messageTime = formatMessageTime(message.createdAt);
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
  const sourceItems = [
    ...(Array.isArray(message.metadata?.documentationSources) ? message.metadata.documentationSources : []),
    ...(Array.isArray(message.metadata?.knowledgeSources) ? message.metadata.knowledgeSources : []),
  ].filter((source, index, sources) => source?.url && sources.findIndex((item) => item.url === source.url) === index);

  return (
    <article className={isUser ? "chat-message chat-message-user" : `chat-message chat-message-assistant${isAdminAnswer ? " chat-message-admin-answer" : ""}`}>
      {isUser ? <div className="chat-message-label">شما</div> : isAdminAnswer ? <div className="chat-admin-answer-label">پاسخ ادمین</div> : <LiaIdentity />}
      <div className={`chat-message-content${isUser ? " chat-message-content-plain" : " chat-message-content-markdown"}`}>
        {renderedContent ? (
          isUser ? renderedContent : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {renderedContent}
            </ReactMarkdown>
          )
        ) : ""}
      </div>
      {isUser && messageTime && <time className="chat-message-time" dateTime={new Date(message.createdAt).toISOString()}>{messageTime}</time>}
      {!isUser && sourceItems.length > 0 && <div className="chat-message-sources"><p>منابع پاسخ</p>{sourceItems.map((source) => <LinkPreviewCard key={source.url} href={source.url} imageUrl={source.imageUrl} description={source.description}>{source.title}</LinkPreviewCard>)}</div>}
      {!isUser && message.metadata?.liaAction === "screenshot" && onScreenshot && (
        <div className="mt-3 rounded-2xl border border-[hsl(var(--chat-accent)/.25)] bg-[hsl(var(--chat-accent)/.07)] p-3">
          <p className="text-xs leading-6 text-[hsl(var(--chat-text))]">{message.metadata.screenshotReason || "عکس از صفحه به تشخیص دقیق کمک می‌کند."}</p>
          <Button type="button" size="sm" className="mt-3 min-h-11" onClick={onScreenshot}>
            <ImagePlus size={16} aria-hidden="true" />
            عکس از صفحه
          </Button>
        </div>
      )}
      {!isUser && message.metadata?.liaAction === "contact" && onContactSubmit && showContactForm && !isStreaming && (
        <ContactForm onSubmit={onContactSubmit} disabled={isLive || isStreaming} />
      )}
      {attachments.length > 0 && (
        <div className="chat-message-attachments">
          {attachments.map((attachment, index) => (
            <div className="chat-attachment-chip" key={`${attachment.url}-${index}`}>
              {attachment.mediaType?.startsWith("image/") ? <Image unoptimized width={28} height={28} src={attachment.url} alt={attachment.filename || "فایل پیوست"} className="chat-attachment-image" /> : null}
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
