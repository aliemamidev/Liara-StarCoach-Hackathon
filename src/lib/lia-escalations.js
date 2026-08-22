import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeKnowledgeText } from "@/lib/lia-brain";
import { MAX_DATA_URL_LENGTH } from "@/lib/chat-message-validation.mjs";

const MAX_TEXT = 5000;

export const CONTACT_REQUEST_MESSAGE = `## اطلاعات تماس لازم است

برای اینکه ادمین بتواند پاسخ این درخواست را برایتان ارسال کند، لطفاً در یک پیام وارد کنید:

نام و نام خانوادگی: …
شماره موبایل: …`;
export const CONTACT_STAGE = "awaiting_contact";

function normalizeDigits(value) {
  return String(value || "").replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function parseGuestContact(text) {
  const value = String(text || "").trim();
  const nameMatch = value.match(/نام(?:\s*و\s*نام\s*خانوادگی)?\s*[:：-]\s*(.+?)(?=\s*(?:شماره\s*(?:موبایل|تماس)|موبایل|تلفن)\s*[:：-]|$)/iu);
  const phoneMatch = value.match(/(?:شماره\s*(?:موبایل|تماس)|موبایل|تلفن)\s*[:：-]?\s*([+\d۰-۹٠-٩\s()-]{8,20})/iu);
  const name = nameMatch?.[1]?.replace(/[\n،,]+$/, "").trim().slice(0, 120) || "";
  const phone = normalizeDigits(phoneMatch?.[1] || "").replace(/[^\d+]/g, "");
  if (!name || !/^(?:\+98|98|0)?9\d{9}$/.test(phone)) return null;
  return { name, phone: phone.startsWith("+98") ? `0${phone.slice(3)}` : phone.startsWith("98") ? `0${phone.slice(2)}` : phone };
}

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
    const url = typeof part.url === "string" && part.url.startsWith("data:") && part.url.length <= MAX_DATA_URL_LENGTH ? part.url : undefined;
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
    classification: plan.classification || null,
    decision: plan.decision || null,
    reason: plan.reason || null,
    sourceConfidence: Number(plan.sourceConfidence || 0),
    securityRisk: plan.securityRisk === true,
    sources: [...(plan.brainHits || []), ...(plan.hits || [])].map((hit) => ({
      title: hit.title || hit.question || "منبع داخلی لیارا",
      url: hit.url || "",
      sourceType: hit.sourceType || (hit.question ? "ADMIN" : "DOCS"),
      score: hit.score || 0,
      confidence: Number(hit.confidence || 0),
    })).slice(0, 20),
  };
}

export async function createOrReuseEscalation({ chatId, messages, query, clarifiedQuestion, plan, contact }) {
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
        ...(contact ? { guestName: contact.name, guestPhone: contact.phone } : {}),
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
        metadata: { liaStage: "admin_answer", source: "admin" },
        parts: [{ type: "text", text: assistantText }],
      },
    });
    return { ticket: updated, knowledgeEntry };
  });
}
