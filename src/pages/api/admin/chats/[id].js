import { requireAdmin } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

function textFromParts(parts = []) {
  return parts.filter((part) => part?.type === "text").map((part) => String(part.text || "")).join("").trim();
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  }

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: String(req.query?.id || "") },
      include: { user: { select: { name: true, email: true } }, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!chat) return res.status(404).json({ message: "گفتگو پیدا نشد." });
    return res.status(200).json({
      item: {
        id: chat.id,
        title: chat.title,
        user: chat.user?.name || chat.user?.email?.split("@")[0] || "کاربر مهمان",
        email: chat.user?.email || "مهمان ناشناس",
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messages: chat.messages.map((message) => ({
          id: message.id,
          role: message.role,
          text: textFromParts(message.parts),
          parts: message.parts,
          metadata: message.metadata,
          createdAt: message.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Admin chat detail failed", error);
    return res.status(503).json({ message: "جزئیات گفتگو در دسترس نیست." });
  }
}
