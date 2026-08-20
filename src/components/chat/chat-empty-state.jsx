import { Sparkles } from "lucide-react";

const suggestions = [
  "چطور پروژه‌ام را روی لیارا مستقر کنم؟",
  "چطور یک پایگاه‌داده ایجاد کنم؟",
  "برای شروع کار با لیارا از کجا شروع کنم؟",
];

export function ChatEmptyState({ onSuggestion }) {
  return (
    <section className="chat-empty-state" aria-labelledby="chat-empty-title">
      <div className="chat-empty-mark" aria-hidden="true">
        <Sparkles size={20} />
      </div>
      <h1 id="chat-empty-title">سلام، من لیا هستم</h1>
      <p>پرسش فنی‌ات دربارهٔ محصولات و سرویس‌های لیارا را بپرس تا بر اساس Documentation راهنمایی‌ات کنم.</p>
      <div className="chat-suggestions">
        {suggestions.map((suggestion) => (
          <button
            type="button"
            className="chat-suggestion"
            key={suggestion}
            onClick={() => onSuggestion(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}






