import { normalizeKnowledgeText, knowledgeSummary } from "@/lib/lia-brain";
import { isUnsafeLiaDraft } from "@/lib/lia-controller";
import { requireAdmin } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const sourceTypes = new Set(["ADMIN", "DOCS", "WEB"]);

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  try {
    if (req.method === "GET") {
      const query = String(req.query?.q || "").trim();
      const status = String(req.query?.status || "all");
      const page = Math.max(1, Number(req.query?.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query?.pageSize || 25)));
      const where = {
        ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
        ...(query ? { OR: [{ question: { contains: query, mode: "insensitive" } }, { answer: { contains: query, mode: "insensitive" } }] } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.knowledgeEntry.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.knowledgeEntry.count({ where }),
      ]);
      return res.status(200).json({ items: items.map(knowledgeSummary), total, page, pageSize });
    }
    if (req.method === "POST") {
      const question = String(req.body?.question || "").trim().slice(0, 5000);
      const answer = String(req.body?.answer || "").trim().slice(0, 12000);
      if (!question || !answer) return res.status(400).json({ message: "سؤال و پاسخ لازم است." });
      if (isUnsafeLiaDraft(answer)) return res.status(400).json({ message: "این پاسخ شامل محتوای ناامن است." });
      const sourceType = sourceTypes.has(String(req.body?.sourceType || "ADMIN")) ? String(req.body.sourceType || "ADMIN") : "ADMIN";
      const item = await prisma.knowledgeEntry.create({
        data: {
          question,
          normalizedQuestion: normalizeKnowledgeText(question),
          answer,
          sourceType,
          sourceRefs: Array.isArray(req.body?.sourceRefs) ? req.body.sourceRefs.slice(0, 20) : [],
          tags: Array.isArray(req.body?.tags) ? req.body.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20) : [],
          isActive: req.body?.isActive !== false,
          createdById: session.user.id,
        },
      });
      return res.status(201).json({ item: knowledgeSummary(item) });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  } catch (error) {
    console.error("Brain API failed", error);
    return res.status(503).json({ message: "مدیریت مغز در دسترس نیست." });
  }
}
