import { searchDocumentation, searchDocumentationOnline } from "@/lib/docs-search";

export const LIA_STAGES = Object.freeze({
  ANSWER: "answer",
  CLARIFICATION: "clarification",
  PROBABLE: "probable",
});

const QUERY_TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export const CLARIFICATION_MESSAGE = `## پرسش تکمیلی

برای اینکه پاسخ دقیق و قابل اتکایی بدهم، لطفاً نام محصول یا سرویس، پلتفرم، نسخه، متن خطا و در صورت امکان Screenshot یا بخشی از تنظیمات مرتبط را ارسال کنید.`;

export const DOCUMENTATION_UNAVAILABLE_MESSAGE = `## پاسخ

در حال حاضر خواندن Documentation داخلی لیارا در دسترس نیست؛ بنابراین برای جلوگیری از ارائهٔ اطلاعات نادرست، پاسخ قطعی نمی‌دهم. لطفاً کمی بعد دوباره تلاش کنید.`;

export const PROBABLE_FALLBACK_NOTICE = `## پاسخ احتمالی و غیرمستند

منبع مستقیمی در Documentation پیدا نشد. توضیح زیر یک راهنمای عمومی است و ممکن است با تنظیمات یا سرویس‌های اختصاصی لیارا تفاوت داشته باشد.
`;

function normalizeText(value) {
  return String(value || "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return normalizeText(value).toLocaleLowerCase("fa").match(QUERY_TOKEN_PATTERN) || [];
}

export function latestUserText(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return (latestUserMessage?.parts || [])
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

function hitCoverage(hit, queryTokens) {
  const haystack = new Set(tokens(`${hit.title || ""} ${hit.body || ""}`));
  return queryTokens.filter((token) => haystack.has(token)).length;
}

function scoreHit(hit, queryTokens) {
  return hit.score || hitCoverage(hit, queryTokens) / Math.max(queryTokens.length, 1);
}

function isStrongEvidence(hits, query) {
  const queryTokens = [...new Set(tokens(query))];
  if (!queryTokens.length) return false;
  const requiredCoverage = Math.min(2, queryTokens.length);
  const normalizedQuery = normalizeText(query).toLocaleLowerCase("fa");
  return hits.some((hit) => {
    const title = normalizeText(hit.title).toLocaleLowerCase("fa");
    const coverage = hitCoverage(hit, queryTokens);
    const titleMatch = normalizedQuery.length > 1 && title.includes(normalizedQuery);
    return scoreHit(hit, queryTokens) >= 1.5 || (coverage >= requiredCoverage && (queryTokens.length > 1 || titleMatch));
  });
}

function mergeHits(...groups) {
  const merged = new Map();
  for (const hit of groups.flat()) {
    const key = hit.url || hit.path || hit.title;
    const existing = merged.get(key);
    if (!existing || (hit.score || 0) > (existing.score || 0)) merged.set(key, hit);
  }
  return [...merged.values()];
}

function previousStage(messages) {
  const assistant = [...messages].reverse().find((message) => message.role === "assistant");
  return assistant?.metadata?.liaStage;
}

function shouldSearchOnline(hits, query) {
  return !isStrongEvidence(hits, query);
}

export async function createLiaControllerPlan(messages) {
  const query = latestUserText(messages);
  const local = await searchDocumentation(query);
  let hits = local.hits;
  let documentationAvailable = local.available;

  if (shouldSearchOnline(hits, query)) {
    const online = await searchDocumentationOnline(query);
    documentationAvailable = documentationAvailable || online.available;
    hits = mergeHits(hits, online.hits);
  }

  if (!documentationAvailable) {
    return {
      mode: "unavailable",
      stage: LIA_STAGES.CLARIFICATION,
      query,
      hits: [],
    };
  }

  if (isStrongEvidence(hits, query)) {
    return {
      mode: LIA_STAGES.ANSWER,
      stage: LIA_STAGES.ANSWER,
      query,
      hits,
    };
  }

  const stage = previousStage(messages) === LIA_STAGES.CLARIFICATION
    ? LIA_STAGES.PROBABLE
    : LIA_STAGES.CLARIFICATION;

  return { mode: stage, stage, query, hits: [] };
}

export function validateLiaDraft(text) {
  const value = String(text || "").trim();
  if (!value || value.length > 12000) return false;
  if (!value.includes("## پاسخ")) return false;
  if (/##\s*منبع پاسخ|<documentation-source|https?:\/\//i.test(value)) return false;
  if (/system prompt|developer message|internal reasoning|زنجیرهٔ فکر|تحلیل داخلی/i.test(value)) return false;
  return true;
}
