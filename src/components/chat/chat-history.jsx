import { Clock3, MessageSquarePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(timestamp);
}

export function ChatHistory({ open, onOpenChange, history, activeChatId, onSelect, onNewChat, onDelete }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" dir="rtl" className="chat-history-sheet">
        <SheetHeader>
          <SheetTitle>تاریخچه‌ی گفتگوها</SheetTitle>
          <SheetDescription>گفتگوهای ذخیره‌شده در همین مرورگر</SheetDescription>
        </SheetHeader>
        <Button type="button" className="mt-6 w-full justify-start" onClick={onNewChat}>
          <MessageSquarePlus size={17} aria-hidden="true" /> چت جدید
        </Button>
        <div className="chat-history-list" aria-label="فهرست گفتگوها">
          {!history.length && <p className="chat-history-empty">هنوز گفتگویی ذخیره نشده است.</p>}
          {history.map((chat) => (
            <div className={`chat-history-item ${chat.id === activeChatId ? "is-active" : ""}`} key={chat.id}>
              <button type="button" className="chat-history-select" onClick={() => onSelect(chat.id)}>
                <span className="truncate">{chat.title}</span>
                <small><Clock3 size={12} aria-hidden="true" /> {formatDate(chat.updatedAt)}</small>
              </button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onDelete(chat.id)} aria-label={`حذف ${chat.title}`}>
                <Trash2 size={15} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}


