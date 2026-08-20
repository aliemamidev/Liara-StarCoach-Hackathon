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

  return (
    <article className={isUser ? "chat-message chat-message-user" : "chat-message chat-message-assistant"}>
      <div className="chat-message-label">{isUser ? "شما" : "دستیار لیارا"}</div>
      <div className="chat-message-content">{content || (isStreaming ? "" : "پاسخی دریافت نشد.")}</div>
      {!isUser && content && !isStreaming && (
        <ChatActions content={content} onRetry={onRetry} playSound={playSound} />
      )}
    </article>
  );
}

export { messageText };
