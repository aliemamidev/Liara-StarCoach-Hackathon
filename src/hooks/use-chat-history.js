import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "liara-chat-history-v1";
const ACTIVE_KEY = "liara-chat-active-v1";

function textFromMessage(message) {
  return (message?.parts || [])
    .filter((part) => part?.type === "text")
    .map((part) => part.text || "")
    .join("")
    .trim();
}

function serializeMessages(messages) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    ...(message.metadata?.liaStage ? { metadata: { liaStage: message.metadata.liaStage } } : {}),
    parts: (message.parts || [])
      .filter((part) => part?.type === "text")
      .map((part) => ({ type: "text", text: part.text || "" })),
    attachments: (message.parts || [])
      .filter((part) => part?.type === "file")
      .map((part) => ({
        filename: part.filename || "فایل پیوست",
        mediaType: part.mediaType || "application/octet-stream",
      })),
  }));
}

function parseHistory(raw) {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("invalid history");
  return parsed
    .filter((chat) => chat?.id && Array.isArray(chat.messages))
    .map((chat) => ({
      ...chat,
      title: chat.title || textFromMessage(chat.messages.find((message) => message.role === "user")) || "گفتگوی جدید",
      titleGenerated: Boolean(chat.titleGenerated),
      titleGenerationAttempted: Boolean(chat.titleGenerationAttempted || chat.titleGenerated),
    }));
}

export function useChatHistory() {
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatIdState] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const activeId = window.localStorage.getItem(ACTIVE_KEY);
      if (raw) setHistory(parseHistory(raw));
      setActiveChatIdState(activeId || null);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(ACTIVE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  const persist = useCallback((nextHistory) => {
    setHistory(nextHistory);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {
      // A full or unavailable localStorage should never interrupt the chat.
    }
  }, []);

  const setActiveChatId = useCallback((id) => {
    setActiveChatIdState(id || null);
    try {
      if (id) window.localStorage.setItem(ACTIVE_KEY, id);
      else window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Ignore storage failures; the in-memory chat remains usable.
    }
  }, []);

  const saveMessages = useCallback((messages) => {
    if (!messages.length) return activeChatId;
    const now = Date.now();
    const id = activeChatId || `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const existing = history.find((chat) => chat.id === id);
    const nextChat = {
      id,
      title: existing?.title || "گفتگوی جدید",
      titleGenerated: existing?.titleGenerated || false,
      titleGenerationAttempted: existing?.titleGenerationAttempted || false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      messages: serializeMessages(messages),
    };
    const nextHistory = [nextChat, ...history.filter((chat) => chat.id !== id)];
    persist(nextHistory);
    if (!activeChatId) setActiveChatId(id);
    return id;
  }, [activeChatId, history, persist, setActiveChatId]);

  const renameChat = useCallback((id, title, { generated = false } = {}) => {
    const cleanTitle = title?.trim().slice(0, 60);
    if (!cleanTitle) return;
    setHistory((currentHistory) => {
      if (generated && currentHistory.find((chat) => chat.id === id)?.titleGenerated) return currentHistory;
      const nextHistory = currentHistory.map((chat) => (
        chat.id === id
          ? { ...chat, title: cleanTitle, titleGenerated: true, titleGenerationAttempted: true, updatedAt: Date.now() }
          : chat
      ));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      } catch {
        // Ignore storage failures; the in-memory title remains usable.
      }
      return nextHistory;
    });
  }, []);

  const markTitleGenerationAttempted = useCallback((id) => {
    setHistory((currentHistory) => {
      if (!currentHistory.some((chat) => chat.id === id && !chat.titleGenerationAttempted)) return currentHistory;
      const nextHistory = currentHistory.map((chat) => (
        chat.id === id ? { ...chat, titleGenerationAttempted: true } : chat
      ));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      } catch {
        // Ignore storage failures; the in-memory chat remains usable.
      }
      return nextHistory;
    });
  }, []);

  const deleteChat = useCallback((id) => {
    persist(history.filter((chat) => chat.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  }, [activeChatId, history, persist, setActiveChatId]);

  return { history, activeChatId, hydrated, setActiveChatId, saveMessages, renameChat, markTitleGenerationAttempted, deleteChat };
}
