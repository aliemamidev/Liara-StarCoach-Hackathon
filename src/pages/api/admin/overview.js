import { getSession } from "@/lib/auth";
import { getAiConfig, isAiConfigured } from "@/lib/ai-config";
import { isWebSearchConfigured } from "@/lib/web-search";
import { getAdminSettings } from "@/lib/admin-settings";
import { topicFor } from "@/lib/admin-topics";
import { prisma } from "@/lib/prisma";

function initials(name = "کاربر") { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "ک"; }
function messageText(message) { return (message?.parts || []).filter((part) => part?.type === "text" || typeof part?.text === "string").map((part) => part.text || "").join(" ").trim(); }
function formatTime(date) { return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(date); }
function ownerKey(chat) { return chat.userId ? `user:${chat.userId}` : `guest:${chat.ownerTokenHash}`; }
function messageFailed(message) { const metadata = message?.metadata; return Boolean(metadata && typeof metadata === "object" && (metadata.error || metadata.status === "failed")); }

function makeRow(chat) {
  const userMessage = [...chat.messages].reverse().find((message) => message.role === "user");
  const assistantMessage = [...chat.messages].reverse().find((message) => message.role === "assistant");
  const question = messageText(userMessage) || chat.title;
  const response = messageText(assistantMessage) || "پاسخی برای این گفتگو ثبت نشده است.";
  const user = chat.user?.name || (chat.user?.email ? chat.user.email.split("@")[0] : "کاربر مهمان");
  const metadata = assistantMessage?.metadata && typeof assistantMessage.metadata === "object" ? assistantMessage.metadata : {};
  const failed = messageFailed(assistantMessage);
  const unresolved = !assistantMessage || metadata.capturedUnknown === true || metadata.liaStage === "escalated";
  const topic = topicFor(question);
  const status = failed ? "failed" : unresolved ? "review" : "answered";
  return { id: chat.id, chatId: chat.id, user, userType: chat.user ? "registered" : "guest", userTypeLabel: chat.user ? "ثبت‌نام‌شده" : "مهمان", email: chat.user?.email || "مهمان ناشناس", initials: initials(user), question: question.slice(0, 180), topicId: topic.id, topicLabel: topic.label, topic: topic.label, status, statusLabel: failed ? "خطای پاسخ" : unresolved ? "نیازمند بررسی" : "پاسخ ثبت شده", time: formatTime(chat.updatedAt), updatedAt: chat.updatedAt.toISOString(), channel: "چت وب", response: response.slice(0, 500) };
}

function weekSeries(messages, chats) {
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return { date, value: 0, unanswered: 0, failed: 0, users: new Set() }; });
  for (const message of messages) { const day = days.find((item) => item.date.toDateString() === message.createdAt.toDateString()); if (!day) continue; day.value += 1; if (messageFailed(message)) day.failed += 1; }
  for (const chat of chats) { const day = days.find((item) => item.date.toDateString() === chat.updatedAt.toDateString()); if (!day) continue; day.users.add(ownerKey(chat)); if (makeRow(chat).status === "review") day.unanswered += 1; }
  return days.map((item) => ({ day: new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(item.date), date: item.date.toISOString(), value: item.value, unanswered: item.unanswered, failed: item.failed, users: item.users.size }));
}

function trendDirection(values) {
  const completeDays = values.length > 1 ? values.slice(0, -1) : values;
  const previous = completeDays.slice(-6, -3).reduce((sum, value) => sum + value, 0) / 3;
  const latest = completeDays.slice(-3).reduce((sum, value) => sum + value, 0) / 3;
  if (previous === 0 && latest === 0) return "flat";
  if (previous === 0) return latest > 0 ? "up" : "flat";
  const change = (latest - previous) / previous;
  if (Math.abs(change) < 0.05) return "flat";
  return change > 0 ? "up" : "down";
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  const session = await getSession(req).catch(() => null);
  if (!session || session.user.role !== "ADMIN") return res.status(401).json({ message: "دسترسی مجاز نیست." });
  try {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const [chats, recentMessages, totalMessages, pendingEscalations, settings, totalAccounts] = await Promise.all([
      prisma.chat.findMany({ where: { updatedAt: { gte: since } }, include: { user: { select: { name: true, email: true } }, messages: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } }),
      prisma.message.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, role: true, metadata: true } }), prisma.message.count(),
      prisma.escalationTicket.findMany({ where: { status: "PENDING" }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, chatId: true, userQuestion: true, clarifiedQuestion: true, updatedAt: true } }), getAdminSettings(), prisma.user.count(),
    ]);
    const rows = chats.map(makeRow); const owners = new Set(chats.map(ownerKey)); const unanswered = rows.filter((row) => row.status === "review");
    const topicCounts = rows.reduce((counts, row) => counts.set(row.topicLabel, (counts.get(row.topicLabel) || 0) + 1), new Map()); const maxTopic = Math.max(...topicCounts.values(), 1);
    const activeToday = new Set(chats.filter((chat) => chat.updatedAt.toDateString() === new Date().toDateString()).map(ownerKey)).size;
    const weekly = weekSeries(recentMessages, chats); const failedMessages = recentMessages.filter(messageFailed).length;
    const answeredChats = chats.filter((chat) => chat.messages.some((message) => message.role === "assistant")).length; const resolutionRate = chats.length ? Math.round((answeredChats / chats.length) * 1000) / 10 : 0;
    const problemSignals = [{ label: "گفتگوهای نیازمند بررسی", value: unanswered.length, description: "گفتگوهایی که پاسخ قطعی ندارند", progress: Math.min(100, unanswered.length * 10), tone: "orange" }, { label: "ارجاع‌های باز", value: pendingEscalations.length, description: "مواردی که نیازمند بررسی انسانی هستند", progress: Math.min(100, pendingEscalations.length * 10), tone: "red" }, { label: "درخواست‌های ناموفق", value: failedMessages, description: "خطاهای ثبت‌شده در داده‌های پاسخ", progress: Math.min(100, failedMessages * 10), tone: "purple" }].filter((signal) => signal.value > 0);
    const users = Array.from(new Map(chats.map((chat) => [ownerKey(chat), chat])).values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20).map((chat) => { const row = makeRow(chat); return { name: row.user, initials: row.initials, email: row.email, messages: String(chat.messages.length), lastActive: row.time, plan: chat.user ? "عضو ثبت‌نام‌شده" : "مهمان", tone: "blue" }; });
    const kpi = (id, label, value, note, tone, series) => ({ id, label, value: value.toLocaleString("fa-IR"), note, tone, trend: series, trendDirection: trendDirection(series) });
    const notifications = pendingEscalations.map((ticket) => ({ id: `escalation:${ticket.id}`, title: "ارجاع جدید برای بررسی", description: (ticket.clarifiedQuestion || ticket.userQuestion).slice(0, 180), time: formatTime(ticket.updatedAt), chatId: ticket.chatId, ticketId: ticket.id, read: false }));
    if (settings.notifyFailures) recentMessages.filter(messageFailed).slice(-10).forEach((message, index) => notifications.push({ id: `failure:${message.createdAt.toISOString()}:${index}`, title: "خطای پاسخ ثبت شد", description: "یک پاسخ با خطا پایان یافته است.", time: formatTime(message.createdAt), read: false }));
    const aiConfigured = isAiConfigured(getAiConfig());
    return res.status(200).json({ dashboard: { kpis: [kpi("messages", "کل پیام‌ها", totalMessages, "در PostgreSQL", "blue", weekly.map((item) => item.value)), kpi("users", "کاربران یکتا", owners.size, "در ۳۰ روز گذشته", "teal", weekly.map((item) => item.users)), kpi("unanswered", "بدون پاسخ", unanswered.length, "گفتگوهای نیازمند بررسی", "orange", weekly.map((item) => item.unanswered)), kpi("failures", "درخواست ناموفق", failedMessages, "خطای ثبت‌شده در داده‌ها", "red", weekly.map((item) => item.failed))], weekly, topics: Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count], index) => ({ label, count: count.toLocaleString("fa-IR"), percentage: Math.round((count / maxTopic) * 100), tone: ["blue", "teal", "purple", "orange", "slate"][index] })) }, messages: rows.slice(0, 100), users, unanswered: unanswered.slice(0, 50).map((row) => ({ ...row, title: row.question, count: "۱", lastSeen: row.time, severity: "medium", examples: [row.question] })), analytics: { weekly, totalMessages, unanswered: unanswered.length, activeToday, failedMessages, resolutionRate, problemSignals }, userSummary: { totalAccounts, activeToday, uniqueOwners: owners.size, averageMessages: owners.size ? totalMessages / owners.size : 0 }, notifications, system: { database: "connected", assistant: aiConfigured ? "configured" : "unavailable", webSearch: isWebSearchConfigured() ? "enabled" : "unavailable", chatCount: chats.length, pendingEscalations: pendingEscalations.length, activeToday } });
  } catch (error) { console.error("Admin overview failed", error); return res.status(503).json({ message: "داده‌های پنل از PostgreSQL در دسترس نیست." }); }
}
