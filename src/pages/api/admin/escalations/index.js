import { requireAdmin } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

function summary(ticket) {
  return {
    id: ticket.id,
    chatId: ticket.chatId,
    userQuestion: ticket.userQuestion,
    clarifiedQuestion: ticket.clarifiedQuestion,
    status: ticket.status,
    adminAnswer: ticket.adminAnswer,
    guestName: ticket.guestName,
    guestPhone: ticket.guestPhone,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    answeredAt: ticket.answeredAt,
  };
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  }
  try {
    const status = String(req.query?.status || "PENDING");
    const where = ["PENDING", "ANSWERED", "CLOSED"].includes(status) ? { status } : {};
    const items = await prisma.escalationTicket.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 });
    return res.status(200).json({ items: items.map(summary) });
  } catch (error) {
    console.error("Escalation list failed", error);
    return res.status(503).json({ message: "صف ارجاع‌ها در دسترس نیست." });
  }
}
