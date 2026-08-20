import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getChatOwner } from "@/lib/chat-owner";

function cleanMessage(message) {
  return {
    id: String(message?.id || randomUUID()),
    role: String(message?.role || "user"),
    parts: Array.isArray(message?.parts) ? message.parts : [],
  };
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
  return owner.isAdmin ? {} : owner.userId ? { userId: owner.userId } : { ownerTokenHash: owner.ownerTokenHash };
}

function responseChat(chat) {
  return {
    id: chat.id,
    title: chat.title,
    titleGenerated: chat.titleGenerated,
    createdAt: chat.createdAt.getTime(),
    updatedAt: chat.updatedAt.getTime(),
    messages: chat.messages.map((message) => ({ id: message.id, role: message.role, parts: message.parts })),
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
    const existing = await prisma.chat.findFirst({ where: { id: chat.id, ...ownerWhere(owner) } });
    const data = {
      title: chat.title,
      titleGenerated: chat.titleGenerated,
      ...(owner.userId ? { userId: owner.userId, ownerTokenHash: null } : { ownerTokenHash: owner.ownerTokenHash }),
      createdAt: new Date(chat.createdAt),
      updatedAt: new Date(chat.updatedAt),
    };
    const saved = existing
      ? await prisma.chat.update({ where: { id: existing.id }, data })
      : await prisma.chat.create({ data: { id: chat.id, ...data } });
    await prisma.message.deleteMany({ where: { chatId: saved.id } });
    if (chat.messages.length) await prisma.message.createMany({ data: chat.messages.map((message) => ({ ...message, chatId: saved.id })) });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Chat persistence failed", error);
    return res.status(503).json({ message: "ذخیره‌سازی گفتگو در دسترس نیست." });
  }
}
