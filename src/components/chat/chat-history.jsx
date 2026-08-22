import { Check, ChevronLeft, ChevronRight, MessageSquarePlus, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function ChatHistory({ history, activeChatId, onSelect, onNewChat, onDelete, onRename }) {
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  function startEditing(chat) {
    setEditingId(chat.id);
    setDraftTitle(chat.title || "گفت و گو جدید");
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
    <aside className={`chat-history-dock ${open ? "is-open" : "is-collapsed"}`} dir="rtl" aria-label="تاریخچه‌ی گفتگوها">
      <button
        type="button"
        className="chat-history-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="chat-history-list"
        aria-label={open ? "بستن تاریخچه‌ی گفتگوها" : "باز کردن تاریخچه‌ی گفتگوها"}
        title={open ? "بستن تاریخچه" : "باز کردن تاریخچه"}
      >
        {open ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
        {open && <span>تاریخچه</span>}
      </button>
      {!open ? null : <>
        <div className="chat-history-dock-header">
          <h2>تاریخچه‌ی گفتگوها</h2>
          <p>گفتگوهای ذخیره‌شده در همین مرورگر</p>
        </div>
        <Button type="button" className="mt-6 w-full justify-start" onClick={onNewChat}>
          <MessageSquarePlus size={17} aria-hidden="true" /> گفت و گو جدید
        </Button>
        <div id="chat-history-list" className="chat-history-list" aria-label="فهرست گفتگوها">
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
                  <button type="button" className="chat-history-title" data-cuelume-press="press" data-cuelume-release="release" onClick={() => onSelect(chat.id)} title="باز کردن گفتگو">
                    <span>{chat.title || "گفت و گو جدید"}</span>
                  </button>
                  <button type="button" className="chat-history-edit-button" onClick={() => startEditing(chat)} title="ویرایش نام گفتگو" aria-label={`ویرایش ${chat.title || "گفت و گو جدید"}`}>
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onDelete(chat.id)} aria-label={`حذف ${chat.title}`}>
                    <Trash2 size={15} aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </>}
    </aside>
  );
}
