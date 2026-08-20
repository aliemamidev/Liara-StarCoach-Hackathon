import { Check, Clock3, MessageSquarePlus, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(timestamp);
}

export function ChatHistory({ open, onOpenChange, history, activeChatId, onSelect, onNewChat, onDelete, onRename }) {
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  function startEditing(chat) {
    setEditingId(chat.id);
    setDraftTitle(chat.title || "گفتگوی جدید");
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftTitle("");
  }

  function saveEditing(chat) {
    const title = draftTitle.trim();
    if (!title) return;
    onRename(chat.id, title);
    cancelEditing();
  }

  function handleKeyDown(event, chat) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEditing(chat);
    }
    if (event.key === "Escape") cancelEditing();
  }

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
              {editingId === chat.id ? (
                <div className="chat-history-edit">
                  <input
                    ref={inputRef}
                    value={draftTitle}
                    maxLength={60}
                    aria-label="نام جدید گفتگو"
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onKeyDown={(event) => handleKeyDown(event, chat)}
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveEditing(chat)} disabled={!draftTitle.trim()} aria-label="ذخیره نام گفتگو">
                    <Check size={15} aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEditing} aria-label="لغو تغییر نام">
                    <X size={15} aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <>
                  <button type="button" className="chat-history-title" onClick={() => startEditing(chat)} title="ویرایش نام گفتگو">
                    <span className="truncate">{chat.title || "گفتگوی جدید"}</span>
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                  <button type="button" className="chat-history-open" onClick={() => onSelect(chat.id)}>
                    <small><Clock3 size={12} aria-hidden="true" /> {formatDate(chat.updatedAt)}</small>
                  </button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onDelete(chat.id)} aria-label={`حذف ${chat.title}`}>
                    <Trash2 size={15} aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
