import { searchDocumentation, searchDocumentationOnline } from "@/lib/docs-search";

export const LIA_STAGES = Object.freeze({
  ANSWER: "answer",
  CLARIFICATION: "clarification",
  SCREENSHOT: "screenshot",
  PROBABLE: "probable",
  OUT_OF_SCOPE: "out_of_scope",
});

const QUERY_TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export const CLARIFICATION_MESSAGE = `## پرسش تکمیلی

برای تشخیص دقیق‌تر، لطفاً کوتاه بگویید:

1. مشکل در کدام صفحه، بخش یا محیط رخ می‌دهد؟
2. متن دقیق خطا یا پیام نمایش‌داده‌شده چیست؟
3. انتظار داشتید چه اتفاقی بیفتد و در عمل چه اتفاقی افتاد؟`;

export const SCREENSHOT_MESSAGE = `## درخواست Screenshot

برای اینکه بتوانم مشکل را دقیق‌تر بررسی کنم، لطفاً یک Screenshot ارسال کنید. بهتر است تصویر شامل صفحه‌ای باشد که مشکل در آن رخ می‌دهد، متن کامل خطا یا پیام، و بخش تنظیمات یا پنلی باشد که به مشکل مربوط است. اگر مشکل چند مرحله دارد، از مراحل مهم هم تصویر بفرستید.

1. از صفحهٔ مرتبط Screenshot بگیرید.
2. در همین چت، از منوی «افزودن» گزینهٔ «Screenshot» را انتخاب کنید؛ یا تصویر را با گزینهٔ «افزودن فایل» پیوست کنید.

قبل از ارسال، رمز عبور، کلید API، توکن، اطلاعات شخصی یا هر دادهٔ محرمانه را مخفی کنید. اگر امکان ارسال تصویر ندارید، متن کامل خطا، مراحل انجام کار و سیستم‌عامل/مرورگر/ابزار و نسخهٔ آن را بنویسید.`;

export const DOCUMENTATION_UNAVAILABLE_MESSAGE = `## پاسخ

در حال حاضر خواندن Documentation داخلی لیارا در دسترس نیست؛ بنابراین برای جلوگیری از ارائهٔ اطلاعات نادرست، پاسخ قطعی نمی‌دهم. لطفاً کمی بعد دوباره تلاش کنید.`;

export const UNSAFE_DRAFT_MESSAGE = `## پاسخ

نمی‌تونم دستورهای مخرب یا اطلاعات داخلی سیستم را ارائه کنم. اگر هدفت حل یک مشکل فنی است، راهکار امن و قابل بازگشتش را توضیح می‌دهم.`;

export const AI_UNAVAILABLE_MESSAGE = `## پاسخ

سرویس پاسخ‌گویی هوش مصنوعی موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.`;

export const OUT_OF_SCOPE_MESSAGE = "من فقط دربارهٔ سرویس‌های لیارا و مفاهیم فنی مرتبط کمک می‌کنم. اگر سؤال فنی یا مربوط به لیارا داری، خوشحال می‌شم راهنماییت کنم.";

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

function hasImageAttachment(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return (latestUserMessage?.parts || []).some((part) => part?.type === "file" && String(part.mediaType || "").startsWith("image/"));
}

const IN_SCOPE_PATTERN = /(?:هوش مصنوعی|یادگیری ماشین|یادگیری ماشینی|مدل زبان|چت‌?بات|الگوریتم|پرامپت|توکن|پردازش متن|تکنولوژی|فناوری|کامپیوتر|رایانه|برنامه‌نویسی|برنامه نویسی|کدنویسی|کد|پایتون|جاوااسکریپت|تایپ‌?اسکریپت|جاوا|php|node(?:\.js)?|react|next(?:\.js)?|vue|sql|api|sdk|http|سرور|کلود|ابری|دیتابیس|پایگاه داده|داده|شبکه|امنیت|رمزنگاری|لینوکس|ویندوز|گیت|docker|کانتینر|استقرار|دیپلوی|deploy|دامنه|dns|وب‌?سایت|سایت|اپلیکیشن|نرم‌افزار|نرم افزار|لینک|فایل|خطا|ارور|لاگ|پایگاه دانش|مستندات|documentation|لیارا|liara|پنل|حساب کاربری|سرویس|صورتحساب|فاکتور|ذخیره‌?سازی|پشتیبان|بکاپ|redis|mysql|mongodb|postgres|آی‌?پی|پورت|ssl|tls|ssh|cors|cdn|github|gitlab|اسکرین‌?شات|screenshot)/iu;
const TECHNICAL_SYMPTOM_PATTERN = /(?:برنامه\s*(?:م|ام|من)|اپلیکیشن\s*(?:م|ام|من)|سایت\s*(?:م|ام|من)|کار نمی\s*(?:کند|کنه)|درست نیست|خراب شده|مشکل دارم|خطا دارم|ارور دارم)/iu;

const GENERAL_TECHNICAL_EXPLANATION_PATTERN = /(?:چیست|چیستند|یعنی چه|چه تفاوتی|تفاوت|تعریف|معنی|چگونه کار می\s*کند|چطور کار می\s*کند|توضیح بده|معرفی کن|what is|what are|difference between|how does .* work)/iu;
const LIARA_SPECIFIC_PATTERN = /(?:لیارا|liara|پنل|قیمت|پلن|صورتحساب|فاکتور|سرویس لیارا|مستندات لیارا|حساب کاربری|دامنه\s*من|دامنه\s*ام|اپلیکیشن\s*من|برنامه\s*ام|در لیارا|روی لیارا)/iu;

export function isLikelyInScope(query) {
  const normalizedQuery = normalizeText(query);
  return IN_SCOPE_PATTERN.test(normalizedQuery) || TECHNICAL_SYMPTOM_PATTERN.test(normalizedQuery);
}

function isGeneralTechnicalQuery(query) {
  const normalizedQuery = normalizeText(query);
  return isLikelyInScope(normalizedQuery)
    && GENERAL_TECHNICAL_EXPLANATION_PATTERN.test(normalizedQuery)
    && !LIARA_SPECIFIC_PATTERN.test(normalizedQuery);
}

function hasInsufficientDescription(query) {
  const queryTokens = [...new Set(tokens(query))];
  return queryTokens.length < 3 || /^(کمک|مشکل دارم|کار نمی‌کند|کار نمیکند|خطا|ارور|درست نیست|نمی‌شود|نمیشه|help|error)$/i.test(normalizeText(query));
}

const VISUAL_DIAGNOSTIC_PATTERN = /(?:خطا|ارور|کار نمی\s*(?:کند|کنه)|درست اجرا نمی\s*شود|باگ|رفتار غیرمنتظره|نمایش داده نمی\s*شود|ظاهر خراب|صفحه سفید|صفحه سیاه|پیام خطا|اسکرین‌?شات|screenshot|error|bug|not working|unexpected)/iu;
const VISUAL_CONTEXT_PATTERN = /(?:صفحه|پنل|تنظیمات|رابط کاربری|ظاهر|نمایش)/iu;

function needsVisualDiagnosis(query) {
  const normalizedQuery = normalizeText(query);
  return VISUAL_DIAGNOSTIC_PATTERN.test(normalizedQuery)
    || (/(?:مشکل|درست نیست|نمی‌شود|نمیشه|خراب)/iu.test(normalizedQuery) && VISUAL_CONTEXT_PATTERN.test(normalizedQuery));
}

function shouldSearchOnline(hits, query) {
  return !isStrongEvidence(hits, query);
}

export async function createLiaControllerPlan(messages) {
  const query = latestUserText(messages);
  const priorStage = previousStage(messages);

  if (!isLikelyInScope(query)) {
    return { mode: LIA_STAGES.OUT_OF_SCOPE, stage: LIA_STAGES.OUT_OF_SCOPE, query, hits: [] };
  }

  if (hasImageAttachment(messages)) {
    return { mode: LIA_STAGES.PROBABLE, stage: LIA_STAGES.PROBABLE, query, hits: [] };
  }

  if (isGeneralTechnicalQuery(query)) {
    return { mode: LIA_STAGES.PROBABLE, stage: LIA_STAGES.PROBABLE, query, hits: [] };
  }

  if (hasInsufficientDescription(query) || needsVisualDiagnosis(query)) {
    const stage = priorStage === LIA_STAGES.CLARIFICATION
      ? LIA_STAGES.SCREENSHOT
      : LIA_STAGES.CLARIFICATION;
    return { mode: stage, stage, query, hits: [] };
  }

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

  const stage = priorStage === LIA_STAGES.CLARIFICATION
    ? LIA_STAGES.SCREENSHOT
    : LIA_STAGES.CLARIFICATION;

  return { mode: stage, stage, query, hits: [] };
}

const INTERNAL_OUTPUT_PATTERN = /system prompt|developer message|internal reasoning|زنجیرهٔ فکر|تحلیل داخلی|پرامپت\s*سیستم|قوانین\s*داخلی|دستورهای\s*داخلی/i;
const DANGEROUS_COMMAND_PATTERN = /(?:rm\s+-rf|docker\s+system\s+prune(?:\s+-a)?|DROP\s+DATABASE|TRUNCATE\s+TABLE|git\s+push\s+--force|kubectl\s+delete\s+.*--all)/i;

export function isUnsafeLiaDraft(text) {
  const value = String(text || "");
  return INTERNAL_OUTPUT_PATTERN.test(value) || DANGEROUS_COMMAND_PATTERN.test(value);
}

export function validateLiaDraft(text) {
  const value = String(text || "").trim();
  if (!value || value.length > 12000) return false;
  if (!value.includes("## پاسخ")) return false;
  if (/##\s*منبع پاسخ|<documentation-source|https?:\/\//i.test(value)) return false;
  if (isUnsafeLiaDraft(value)) return false;
  return true;
}
