import { prisma } from "@/lib/prisma";

const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export function normalizeKnowledgeText(value) {
  return String(value || "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fa");
}

function tokens(value) {
  return normalizeKnowledgeText(value).match(TOKEN_PATTERN) || [];
}

function scoreEntry(entry, queryTokens, normalizedQuery) {
  const question = normalizeKnowledgeText(entry.question);
  const answer = normalizeKnowledgeText(entry.answer);
  const haystack = new Set(tokens(`${question} ${answer}`));
  const coverage = queryTokens.filter((token) => haystack.has(token)).length;
  let score = coverage / Math.max(queryTokens.length, 1);
  if (question.includes(normalizedQuery)) score += 2;
  score += queryTokens.filter((token) => question.includes(token)).length * 0.35;
  return { ...entry, score, coverage };
}

export async function searchKnowledge(query, limit = 1) {
  const normalizedQuery = normalizeKnowledgeText(query);
  const queryTokens = [...new Set(tokens(normalizedQuery))];
  if (!queryTokens.length) return [];

  const entries = await prisma.knowledgeEntry.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  return entries
    .map((entry) => scoreEntry(entry, queryTokens, normalizedQuery))
    .filter((entry) => entry.coverage > 0 || entry.score >= 1.5)
    .sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function isStrongKnowledgeEvidence(entries, query) {
  const queryTokens = [...new Set(tokens(query))];
  if (!queryTokens.length) return false;
  return entries.some((entry) => entry.score >= 1.5 || entry.coverage >= Math.min(2, queryTokens.length));
}

export function formatKnowledgeContext(entries = []) {
  return entries.map((entry, index) => `<knowledge-source id="${index + 1}">
سؤال تأییدشده: ${entry.question}
پاسخ تأییدشده:
${entry.answer}
برچسب‌ها: ${(entry.tags || []).join(", ")}
</knowledge-source>`).join("\n\n");
}

export function formatKnowledgeSources(entries = []) {
  if (!entries.length) return "";
  return `\n\n## منبع پاسخ\n\n🧠 دانش تأییدشدهٔ لیارا:\n\n- ${entries[0].question}`;
}

export function knowledgeSummary(entry) {
  return {
    id: entry.id,
    question: entry.question,
    answer: entry.answer,
    sourceType: entry.sourceType,
    sourceRefs: entry.sourceRefs,
    tags: entry.tags,
    isActive: entry.isActive,
    usageCount: entry.usageCount,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}
