import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_DATA_URL_LENGTH } from "@/lib/chat-message-validation.mjs";

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
    ...(Number.isFinite(Number(message.createdAt)) ? { createdAt: Number(message.createdAt) } : {}),
    ...(message.metadata ? {
      metadata: {
        ...(message.metadata.liaStage ? { liaStage: message.metadata.liaStage } : {}),
        ...(message.metadata.liaAction ? { liaAction: message.metadata.liaAction } : {}),
        ...(message.metadata.screenshotReason ? { screenshotReason: message.metadata.screenshotReason } : {}),
        ...(message.metadata.ticketId ? { ticketId: message.metadata.ticketId } : {}),
        ...(Array.isArray(message.metadata.documentationSources) ? { documentationSources: message.metadata.documentationSources.slice(0, 4) } : {}),
        ...(Array.isArray(message.metadata.knowledgeSources) ? { knowledgeSources: message.metadata.knowledgeSources.slice(0, 4) } : {}),
      },
    } : {}),
    parts: (message.parts || []).flatMap((part) => {
      if (part?.type === "text") return [{ type: "text", text: part.text || "" }];
      if (part?.type !== "file") return [];
      const base = { type: "file", filename: part.filename || "فایل پیوست", mediaType: part.mediaType || "application/octet-stream" };
      return typeof part.url === "string" && part.url.startsWith("data:") && part.url.length <= MAX_DATA_URL_LENGTH
        ? [{ ...base, url: part.url }]
        : [base];
    }),
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
    }));
}

export function useChatHistory() {
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatIdState] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [offline, setOffline] = useState(false);
  const saveQueueRef = useRef(Promise.resolve());
  const historyRef = useRef([]);
  const activeChatIdRef = useRef(null);

  const enqueuePersistence = useCallback((chat, method = "POST", body = { chat }) => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(async () => {
        const response = await fetch("/api/chats/", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("chat-persistence-failed");
        setOffline(false);
      })
      .catch(() => setOffline(true));
    return saveQueueRef.current;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/chats/");
        if (!response.ok) throw new Error("chat-api-unavailable");
        const result = await response.json();
        const nextHistory = parseHistory(JSON.stringify(result.chats || []));
        const preferredId = window.localStorage.getItem(ACTIVE_KEY);
        const activeId = nextHistory.some((chat) => chat.id === preferredId) ? preferredId : nextHistory[0]?.id || null;
        historyRef.current = nextHistory;
        setHistory(nextHistory);
        activeChatIdRef.current = activeId;
        setActiveChatIdState(activeId);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
        if (activeId) window.localStorage.setItem(ACTIVE_KEY, activeId);
        else window.localStorage.removeItem(ACTIVE_KEY);
        setOffline(false);
      } catch {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          const activeId = window.localStorage.getItem(ACTIVE_KEY);
          if (raw) {
            const cachedHistory = parseHistory(raw);
            historyRef.current = cachedHistory;
            setHistory(cachedHistory);
          }
          activeChatIdRef.current = activeId || null;
          setActiveChatIdState(activeId || null);
          setOffline(true);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.removeItem(ACTIVE_KEY);
        }
      } finally {
        setHydrated(true);
      }
    };
    load();
  }, []);

  const persist = useCallback((nextHistory) => {
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {
      // A full or unavailable localStorage should never interrupt the chat.
    }
  }, []);

  const setActiveChatId = useCallback((id) => {
    activeChatIdRef.current = id || null;
    setActiveChatIdState(id || null);
    try {
      if (id) window.localStorage.setItem(ACTIVE_KEY, id);
      else window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Ignore storage failures; the in-memory chat remains usable.
    }
  }, []);

  const saveMessages = useCallback((messages) => {
    if (!messages.length) return activeChatIdRef.current;
    const now = Date.now();
    const id = activeChatIdRef.current || `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const currentHistory = historyRef.current;
    const existing = currentHistory.find((chat) => chat.id === id);
    const nextChat = {
      id,
      title: existing?.title || "گفتگوی جدید",
      titleGenerated: existing?.titleGenerated || false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      messages: serializeMessages(messages),
    };
    const nextHistory = [nextChat, ...currentHistory.filter((chat) => chat.id !== id)];
    persist(nextHistory);
    enqueuePersistence(nextChat);
    if (!activeChatIdRef.current) setActiveChatId(id);
    return id;
  }, [persist, setActiveChatId, enqueuePersistence]);

  const renameChat = useCallback((id, title, { generated = false } = {}) => {
    const cleanTitle = title?.trim().slice(0, 60);
    if (!cleanTitle) return;
    const currentHistory = historyRef.current;
    if (generated && currentHistory.find((chat) => chat.id === id)?.titleGenerated) return;
    const nextHistory = currentHistory.map((chat) => (chat.id === id ? { ...chat, title: cleanTitle, titleGenerated: true, updatedAt: Date.now() } : chat));
    persist(nextHistory);
    const chat = nextHistory.find((item) => item.id === id);
    if (chat) enqueuePersistence(chat);
  }, [enqueuePersistence, persist]);

  const deleteChat = useCallback((id) => {
    persist(historyRef.current.filter((chat) => chat.id !== id));
    enqueuePersistence(null, "DELETE", { id });
    if (activeChatIdRef.current === id) setActiveChatId(null);
  }, [persist, setActiveChatId, enqueuePersistence]);

  return { history, activeChatId, hydrated, offline, setActiveChatId, saveMessages, renameChat, deleteChat };
}
