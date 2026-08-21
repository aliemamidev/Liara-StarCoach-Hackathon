import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeKnowledgeText } from "@/lib/lia-brain";

const MAX_TEXT = 5000;
const MAX_ATTACHMENT_DATA = 4 * 1024 * 1024;

function textFromMessage(message) {
  return (message?.parts || []).filter((part) => part?.type === "text").map((part) => String(part.text || "")).join(" ").trim();
}

export function sanitizeConversation(messages = []) {
  return messages.slice(-20).map((message) => ({
    id: String(message.id || ""),
    role: String(message.role || ""),
    text: textFromMessage(message).slice(0, MAX_TEXT),
  }));
}

export function sanitizeAttachments(messages = []) {
  return messages.flatMap((message) => (message?.parts || []).filter((part) => part?.type === "file").map((part) => {
    const url = typeof part.url === "string" && part.url.startsWith("data:") && part.url.length <= MAX_ATTACHMENT_DATA ? part.url : undefined;
    return {
      filename: String(part.filename || "فایل پیوست").slice(0, 180),
      mediaType: String(part.mediaType || "application/octet-stream").slice(0, 120),
      ...(url ? { url } : { truncated: true }),
    };
  }));
}

export function summarizeSearchTrace(plan) {
  return {
    stages: plan.searchTrace || [],
    sources: [...(plan.brainHits || []), ...(plan.hits || [])].map((hit) => ({
      title: hit.title,
      url: hit.url || "",
      sourceType: hit.sourceType || "DOCS",
      score: hit.score || 0,
    })).slice(0, 20),
  };
}

export async function createOrReuseEscalation({ chatId, messages, query, clarifiedQuestion, plan }) {
  const existing = await prisma.escalationTicket.findFirst({ where: { chatId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
  if (existing) return existing;
  try {
    return await prisma.escalationTicket.create({
      data: {
        chatId,
        userQuestion: query.slice(0, MAX_TEXT),
        clarifiedQuestion: (clarifiedQuestion || query).slice(0, MAX_TEXT),
        conversationSnapshot: sanitizeConversation(messages),
        attachmentsSnapshot: sanitizeAttachments(messages),
        searchTrace: summarizeSearchTrace(plan),
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      const concurrentTicket = await prisma.escalationTicket.findFirst({ where: { chatId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
      if (concurrentTicket) return concurrentTicket;
    }
    throw error;
  }
}

export async function appendAssistantMessage(chatId, text) {
  return prisma.message.create({
    data: {
      id: randomUUID(),
      chatId,
      role: "assistant",
      parts: [{ type: "text", text }],
    },
  });
}

export async function answerEscalation({ id, adminId, answer, assistantText, addToBrain = true }) {
  return prisma.$transaction(async (transaction) => {
    const ticket = await transaction.escalationTicket.findUnique({ where: { id } });
    if (!ticket) throw new Error("escalation-not-found");
    if (ticket.status === "CLOSED") throw new Error("escalation-closed");
    if (ticket.status === "ANSWERED") throw new Error("escalation-answered");

    let knowledgeEntry = null;
    if (addToBrain) {
      knowledgeEntry = await transaction.knowledgeEntry.create({
        data: {
          question: ticket.clarifiedQuestion || ticket.userQuestion,
          normalizedQuestion: normalizeKnowledgeText(ticket.clarifiedQuestion || ticket.userQuestion),
          answer: assistantText,
          sourceType: "ADMIN",
          sourceRefs: [{ type: "escalation", id: ticket.id }],
          createdById: adminId,
        },
      });
    }

    const updated = await transaction.escalationTicket.update({
      where: { id },
      data: {
        status: "ANSWERED",
        adminAnswer: answer,
        answeredById: adminId,
        answeredAt: new Date(),
        knowledgeEntryId: knowledgeEntry?.id || null,
      },
    });
    await transaction.message.create({
      data: {
        id: randomUUID(),
        chatId: ticket.chatId,
        role: "assistant",
        parts: [{ type: "text", text: assistantText }],
      },
    });
    return { ticket: updated, knowledgeEntry };
  });
}
