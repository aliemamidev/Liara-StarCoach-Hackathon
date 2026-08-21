import { normalizeKnowledgeText, knowledgeSummary } from "@/lib/lia-brain";
import { isUnsafeLiaDraft } from "@/lib/lia-controller";
import { requireAdmin } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const sourceTypes = new Set(["ADMIN", "DOCS", "WEB"]);

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  const id = String(req.query?.id || "");
  if (!id) return res.status(400).json({ message: "شناسهٔ دانش نامعتبر است." });
  try {
    if (req.method === "PATCH") {
      const current = await prisma.knowledgeEntry.findUnique({ where: { id } });
      if (!current) return res.status(404).json({ message: "مورد دانش پیدا نشد." });
      const question = req.body?.question === undefined ? current.question : String(req.body.question).trim().slice(0, 5000);
      const answer = req.body?.answer === undefined ? current.answer : String(req.body.answer).trim().slice(0, 12000);
      if (isUnsafeLiaDraft(answer)) return res.status(400).json({ message: "این پاسخ شامل محتوای ناامن است." });
      const item = await prisma.knowledgeEntry.update({
        where: { id },
        data: {
          question: question || current.question,
          normalizedQuestion: normalizeKnowledgeText(question || current.question),
          answer: answer || current.answer,
          ...(req.body?.tags ? { tags: req.body.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20) } : {}),
          ...(typeof req.body?.isActive === "boolean" ? { isActive: req.body.isActive } : {}),
          ...(req.body?.sourceType && sourceTypes.has(String(req.body.sourceType)) ? { sourceType: String(req.body.sourceType) } : {}),
          ...(Array.isArray(req.body?.sourceRefs) ? { sourceRefs: req.body.sourceRefs.slice(0, 20) } : {}),
        },
      });
      return res.status(200).json({ item: knowledgeSummary(item) });
    }
    if (req.method === "DELETE") {
      const item = await prisma.knowledgeEntry.update({ where: { id }, data: { isActive: false } });
      return res.status(200).json({ item: knowledgeSummary(item) });
    }
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  } catch (error) {
    if (error?.code === "P2025") return res.status(404).json({ message: "مورد دانش پیدا نشد." });
    console.error("Brain item API failed", error);
    return res.status(503).json({ message: "به‌روزرسانی دانش ممکن نشد." });
  }
}
