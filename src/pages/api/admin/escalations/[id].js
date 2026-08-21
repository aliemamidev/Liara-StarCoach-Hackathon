import { requireAdmin } from "@/lib/admin-api";
import { answerEscalation } from "@/lib/lia-escalations";
import { rewriteAdminAnswer } from "@/lib/lia-admin-answer";
import { prisma } from "@/lib/prisma";
import { publishRealtime } from "@/lib/realtime.mjs";

function serialize(ticket) {
  return {
    id: ticket.id,
    chatId: ticket.chatId,
    userQuestion: ticket.userQuestion,
    clarifiedQuestion: ticket.clarifiedQuestion,
    conversationSnapshot: ticket.conversationSnapshot,
    attachmentsSnapshot: ticket.attachmentsSnapshot,
    searchTrace: ticket.searchTrace,
    status: ticket.status,
    adminAnswer: ticket.adminAnswer,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    answeredAt: ticket.answeredAt,
  };
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  const id = String(req.query?.id || "");
  try {
    if (req.method === "GET") {
      const ticket = await prisma.escalationTicket.findUnique({ where: { id } });
      if (!ticket) return res.status(404).json({ message: "ارجاع پیدا نشد." });
      return res.status(200).json({ item: serialize(ticket) });
    }
    if (req.method === "PATCH") {
      const ticket = await prisma.escalationTicket.findUnique({ where: { id } });
      if (!ticket) return res.status(404).json({ message: "ارجاع پیدا نشد." });
      if (req.body?.status === "CLOSED") {
        const closed = await prisma.escalationTicket.update({ where: { id }, data: { status: "CLOSED" } });
        publishRealtime("escalation.updated", { ticketId: id, chatId: ticket.chatId });
        return res.status(200).json({ item: serialize(closed) });
      }
      const answer = String(req.body?.answer || "").trim().slice(0, 12000);
      if (!answer) return res.status(400).json({ message: "پاسخ ادمین لازم است." });
      const assistantText = await rewriteAdminAnswer(ticket, answer);
      const result = await answerEscalation({ id, adminId: session.user.id, answer, assistantText, addToBrain: req.body?.addToBrain !== false });
      publishRealtime("escalation.updated", { ticketId: id, chatId: ticket.chatId });
      publishRealtime("chat.updated", { chatId: ticket.chatId, reason: "admin_answered" });
      return res.status(200).json({ item: serialize(result.ticket), knowledgeEntry: result.knowledgeEntry });
    }
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  } catch (error) {
    if (error?.message === "unsafe-admin-answer") return res.status(400).json({ message: "این پاسخ شامل محتوای ناامن است." });
    if (error?.message === "escalation-closed") return res.status(409).json({ message: "این ارجاع قبلاً بسته شده است." });
    if (error?.message === "escalation-answered") return res.status(409).json({ message: "این ارجاع قبلاً پاسخ داده شده است." });
    console.error("Escalation item failed", error);
    return res.status(503).json({ message: "عملیات روی ارجاع ممکن نشد." });
  }
}
