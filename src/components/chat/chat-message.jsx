import { ChatActions } from "@/components/chat/chat-actions";

function messageText(message) {
  return (message.parts || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatMessage({ message, onRetry, playSound, isStreaming }) {
  const content = messageText(message);
  const isUser = message.role === "user";
  const attachments = (message.parts || []).filter((part) => part.type === "file" && part.url);

  return (
    <article className={isUser ? "chat-message chat-message-user" : "chat-message chat-message-assistant"}>
      <div className="chat-message-label">{isUser ? "شما" : "دستیار لیارا"}</div>
      <div className="chat-message-content">{content || (isStreaming ? "" : "پاسخی دریافت نشد.")}</div>
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
      {!isUser && content && !isStreaming && (
        <ChatActions content={content} onRetry={onRetry} playSound={playSound} />
      )}
    </article>
  );
}

export { messageText };







