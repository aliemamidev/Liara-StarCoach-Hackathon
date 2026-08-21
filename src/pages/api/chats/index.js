import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getChatOwner } from "@/lib/chat-owner";
import { publishRealtime } from "@/lib/realtime.mjs";
import { validateChatMessages } from "@/lib/chat-message-validation.mjs";

function cleanMessage(message) {
  return {
    id: String(message?.id || randomUUID()),
    role: String(message?.role || "user"),
    parts: Array.isArray(message?.parts) ? message.parts : [],
    ...(Number.isFinite(Number(message?.createdAt)) ? { createdAt: Number(message.createdAt) } : {}),
    ...(message?.metadata && typeof message.metadata === "object" ? { metadata: message.metadata } : {}),
  };
}

function validChat(chat) {
  return chat && typeof chat.title === "string" && Array.isArray(chat.messages) && validateChatMessages(chat.messages);
}

function cleanChat(chat) {
  return {
    id: String(chat?.id || randomUUID()),
    title: String(chat?.title || "گفتگوی جدید").slice(0, 60),
    titleGenerated: Boolean(chat?.titleGenerated),
    createdAt: Number(chat?.createdAt) || Date.now(),
    updatedAt: Number(chat?.updatedAt) || Date.now(),
    messages: Array.isArray(chat?.messages) ? chat.messages.map(cleanMessage) : [],
  };
}

function ownerWhere(owner) {
  return owner.userId ? { userId: owner.userId } : { ownerTokenHash: owner.ownerTokenHash };
}

function responseChat(chat) {
  return {
    id: chat.id,
    title: chat.title,
    titleGenerated: chat.titleGenerated,
    createdAt: chat.createdAt.getTime(),
    updatedAt: chat.updatedAt.getTime(),
    messages: chat.messages.map((message) => ({ id: message.id, role: message.role, parts: message.parts, createdAt: message.createdAt.getTime(), ...(message.metadata ? { metadata: message.metadata } : {}) })),
  };
}

export default async function handler(req, res) {
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  }
  try {
    const owner = await getChatOwner(req, res);
    if (req.method === "GET") {
      const chats = await prisma.chat.findMany({ where: ownerWhere(owner), include: { messages: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } });
      return res.status(200).json({ chats: chats.map(responseChat) });
    }
    if (req.method === "DELETE") {
      const chatId = String(req.body?.id || "");
      const chat = await prisma.chat.findFirst({ where: { id: chatId, ...ownerWhere(owner) } });
      if (chat) await prisma.chat.delete({ where: { id: chat.id } });
      res.status(204).end();
      return;
    }

    const chat = cleanChat(req.body?.chat);
    if (!validChat(chat)) return res.status(400).json({ message: "ساختار گفتگو معتبر نیست." });
    const data = {
      title: chat.title,
      titleGenerated: chat.titleGenerated,
      ...(owner.userId ? { userId: owner.userId, ownerTokenHash: null } : { ownerTokenHash: owner.ownerTokenHash }),
      createdAt: new Date(chat.createdAt),
      updatedAt: new Date(chat.updatedAt),
    };
    const saved = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.chat.findFirst({ where: { id: chat.id, ...ownerWhere(owner) } });
      if (existing) {
        const claimed = await transaction.chat.updateMany({
          where: { id: existing.id, ...ownerWhere(owner), updatedAt: { lte: data.updatedAt } },
          data,
        });
        if (!claimed.count) return null;
      } else {
        await transaction.chat.create({ data: { id: chat.id, ...data } });
      }

      await transaction.message.deleteMany({ where: { chatId: chat.id } });
      if (chat.messages.length) {
        const fallbackCreatedAt = Date.now();
        await transaction.message.createMany({
          data: chat.messages.map((message, index) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            ...(message.metadata ? { metadata: message.metadata } : {}),
            chatId: chat.id,
            createdAt: new Date(message.createdAt || fallbackCreatedAt + index),
          })),
        });
      }
      return { id: chat.id };
    });

    if (saved) publishRealtime("chat.updated", { chatId: saved.id, owner: owner.userId ? "user" : "guest", messageCount: chat.messages.length });
    return res.status(200).json({ ok: true, persisted: Boolean(saved) });
  } catch (error) {
    console.error("Chat persistence failed", error);
    return res.status(503).json({ message: "ذخیره‌سازی گفتگو در دسترس نیست." });
  }
}
