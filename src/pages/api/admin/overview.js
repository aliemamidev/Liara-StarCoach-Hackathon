import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const TOPICS = [
  ["استقرار اپلیکیشن", /deploy|استقرار|دیپلوی|اپلیکیشن|node/i],
  ["پایگاه داده", /database|دیتابیس|پایگاه|postgres|redis|sql/i],
  ["دامنه و DNS", /dns|دامنه|domain|502/i],
  ["هزینه و صورتحساب", /هزینه|صورتحساب|فاکتور|قیمت/i],
  ["پایش و لاگ", /لاگ|log|پایش|monitor/i],
];

function topicFor(text) {
  return TOPICS.find(([, pattern]) => pattern.test(text))?.[0] || "سایر موضوعات";
}

function initials(name = "کاربر") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "ک";
}

function messageText(message) {
  return (message?.parts || []).filter((part) => part?.type === "text" || typeof part?.text === "string").map((part) => part.text || "").join(" ").trim();
}

function formatTime(date) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function ownerKey(chat) {
  return chat.userId ? `user:${chat.userId}` : `guest:${chat.ownerTokenHash}`;
}

function makeRow(chat) {
  const userMessage = [...chat.messages].reverse().find((message) => message.role === "user");
  const assistantMessage = [...chat.messages].reverse().find((message) => message.role === "assistant");
  const question = messageText(userMessage) || chat.title;
  const response = messageText(assistantMessage) || "پاسخی برای این گفتگو ثبت نشده است.";
  const user = chat.user?.name || (chat.user?.email ? chat.user.email.split("@")[0] : "کاربر مهمان");
  const unresolved = !assistantMessage;
  return {
    id: chat.id,
    chatId: chat.id,
    user,
    email: chat.user?.email || "مهمان ناشناس",
    initials: initials(user),
    question: question.slice(0, 180),
    topic: topicFor(question),
    status: unresolved ? "review" : "answered",
    statusLabel: unresolved ? "بدون پاسخ" : "پاسخ ثبت شده",
    time: formatTime(chat.updatedAt),
    channel: "چت وب",
    response: response.slice(0, 500),
  };
}

function weekSeries(messages) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return { date, value: 0, unanswered: 0 };
  });
  for (const message of messages) {
    const day = days.find((item) => item.date.toDateString() === message.createdAt.toDateString());
    if (day) day.value += 1;
  }
  return days.map((item) => ({ day: new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(item.date), value: item.value, unanswered: item.unanswered }));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  const session = await getSession(req).catch(() => null);
  if (!session || session.user.role !== "ADMIN") return res.status(401).json({ message: "دسترسی مجاز نیست." });

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [chats, recentMessages, totalMessages, pendingEscalations] = await Promise.all([
      prisma.chat.findMany({ where: { updatedAt: { gte: since } }, include: { user: { select: { name: true, email: true } }, messages: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } }),
      prisma.message.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, role: true, metadata: true } }),
      prisma.message.count(),
      prisma.escalationTicket.findMany({ where: { status: "PENDING" }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, chatId: true, userQuestion: true, clarifiedQuestion: true, updatedAt: true } }),
    ]);
    const rows = chats.map(makeRow);
    const owners = new Set(chats.map(ownerKey));
    const unanswered = rows.filter((row) => row.status === "review");
    const topicCounts = rows.reduce((counts, row) => counts.set(row.topic, (counts.get(row.topic) || 0) + 1), new Map());
    const maxTopic = Math.max(...topicCounts.values(), 1);
    const activeToday = new Set(chats.filter((chat) => chat.updatedAt.toDateString() === new Date().toDateString()).map(ownerKey)).size;
    const weekly = weekSeries(recentMessages);
    const failedMessages = recentMessages.filter((message) => message.metadata && typeof message.metadata === "object" && (message.metadata.error || message.metadata.status === "failed")).length;
    const answeredChats = chats.filter((chat) => chat.messages.some((message) => message.role === "assistant")).length;
    const resolutionRate = chats.length ? Math.round((answeredChats / chats.length) * 1000) / 10 : 0;
    const problemSignals = [
      { label: "گفتگوهای بدون پاسخ", value: unanswered.length, description: "گفتگوهایی که پیام دستیار ندارند", progress: Math.min(100, unanswered.length * 10), tone: "orange" },
      { label: "ارجاع‌های باز", value: pendingEscalations.length, description: "مواردی که نیازمند بررسی انسانی هستند", progress: Math.min(100, pendingEscalations.length * 10), tone: "red" },
      { label: "درخواست‌های ناموفق", value: failedMessages, description: "خطاهای ثبت‌شده در متادیتای پیام", progress: Math.min(100, failedMessages * 10), tone: "purple" },
    ].filter((signal) => signal.value > 0);
    const users = Array.from(new Map(chats.map((chat) => [ownerKey(chat), chat])).values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20).map((chat) => {
      const row = makeRow(chat);
      return { name: row.user, initials: row.initials, email: row.email, messages: String(chat.messages.length), lastActive: row.time, plan: chat.user ? "عضو ثبت‌نام‌شده" : "مهمان", tone: "blue" };
    });

    return res.status(200).json({
      dashboard: {
        kpis: [
          { id: "messages", label: "کل پیام‌ها", value: totalMessages.toLocaleString("fa-IR"), change: "واقعی", note: "از PostgreSQL", tone: "blue", trend: weekly.map((item) => item.value) },
          { id: "users", label: "کاربران یکتا", value: owners.size.toLocaleString("fa-IR"), change: "واقعی", note: "در ۳۰ روز گذشته", tone: "teal", trend: weekly.map((item) => Math.max(1, item.value)) },
          { id: "unanswered", label: "بدون پاسخ", value: unanswered.length.toLocaleString("fa-IR"), change: "واقعی", note: "گفتگوهای نیازمند بررسی", tone: "orange", trend: weekly.map(() => unanswered.length) },
          { id: "failures", label: "درخواست ناموفق", value: failedMessages.toLocaleString("fa-IR"), change: "واقعی", note: "خطای ثبت‌شده در داده‌ها", tone: "red", trend: weekly.map(() => failedMessages) },
        ],
        weekly,
        topics: Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count], index) => ({ label, count: count.toLocaleString("fa-IR"), percentage: Math.round((count / maxTopic) * 100), tone: ["blue", "teal", "purple", "orange", "slate"][index] })),
      },
      messages: rows.slice(0, 100),
      users,
      unanswered: unanswered.slice(0, 50).map((row) => ({ id: row.id, title: row.question, count: "۱", lastSeen: row.time, severity: "medium", examples: [row.question] })),
      analytics: { weekly, totalMessages, unanswered: unanswered.length, activeToday, failedMessages, resolutionRate, problemSignals },
      userSummary: { totalAccounts: await prisma.user.count(), activeToday, uniqueOwners: owners.size, averageMessages: owners.size ? totalMessages / owners.size : 0 },
      notifications: pendingEscalations.map((ticket) => ({
        id: `escalation:${ticket.id}`,
        title: "ارجاع جدید برای بررسی",
        description: (ticket.clarifiedQuestion || ticket.userQuestion).slice(0, 180),
        time: formatTime(ticket.updatedAt),
        chatId: ticket.chatId,
        ticketId: ticket.id,
        read: false,
      })),
      system: { database: "connected", chatCount: chats.length, pendingEscalations: pendingEscalations.length, activeToday },
    });
  } catch (error) {
    console.error("Admin overview failed", error);
    return res.status(503).json({ message: "داده‌های پنل از PostgreSQL در دسترس نیست." });
  }
}
