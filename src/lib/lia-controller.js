import { searchDocumentation, searchDocumentationOnline } from "@/lib/docs-search";
import { isStrongKnowledgeEvidence, searchKnowledge } from "@/lib/lia-brain";
import { searchWeb } from "@/lib/web-search";

export const LIA_STAGES = Object.freeze({
  ANSWER: "answer",
  CLARIFICATION: "clarifying",
  SCREENSHOT: "awaiting_screenshot",
  RETRIEVING: "retrieving",
  ESCALATED: "escalated",
  ADMIN_ANSWERED: "admin_answered",
  PROBABLE: "probable",
  UNANSWERED: "unanswered",
  OUT_OF_SCOPE: "out_of_scope",
});

const QUERY_TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export const CLARIFICATION_MESSAGE = `## پرسش تکمیلی

برای اینکه راهکار درست را پیدا کنم، چند جزئیات کوتاه لازم دارم.`;

export const SCREENSHOT_MESSAGE = `## بررسی تصویری لازم است

برای تشخیص این مشکل، متن خطا یا وضعیت صفحه در یک Screenshot کمک زیادی می‌کند. قبل از ارسال، رمز عبور، Token، API Key و اطلاعات شخصی را بپوشانید.

اگر امکان ارسال تصویر ندارید، متن کامل خطا، مراحل انجام کار و محیط اجرا را بنویسید.`;

export const DOCUMENTATION_UNAVAILABLE_MESSAGE = `## پاسخ

در حال حاضر خواندن Documentation داخلی لیارا در دسترس نیست؛ بنابراین برای جلوگیری از ارائهٔ اطلاعات نادرست، پاسخ قطعی نمی‌دهم. لطفاً کمی بعد دوباره تلاش کنید.`;

export const UNSAFE_DRAFT_MESSAGE = `## پاسخ

نمی‌تونم دستورهای مخرب یا اطلاعات داخلی سیستم را ارائه کنم. اگر هدفت حل یک مشکل فنی است، راهکار امن و قابل بازگشتش را توضیح می‌دهم.`;

export const AI_UNAVAILABLE_MESSAGE = `## پاسخ

سرویس پاسخ‌گویی هوش مصنوعی موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.`;

export const OUT_OF_SCOPE_MESSAGE = "من فقط دربارهٔ سرویس‌های لیارا و مفاهیم فنی مرتبط کمک می‌کنم. اگر سؤال فنی یا مربوط به لیارا داری، خوشحال می‌شم راهنماییت کنم.";
export const GREETING_MESSAGE = "## پاسخ\n\nسلام! من لیا هستم. دربارهٔ سرویس‌ها و مستندات لیارا کمکت می‌کنم.";

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
  const requiredCoverage = Math.max(1, Math.ceil(queryTokens.length * 0.5));
  const normalizedQuery = normalizeText(query).toLocaleLowerCase("fa");
  return hits.some((hit) => {
    const title = normalizeText(hit.title).toLocaleLowerCase("fa");
    const coverage = hitCoverage(hit, queryTokens);
    const structuralText = normalizeText(`${hit.title || ""} ${hit.section || ""} ${hit.path || ""}`).toLocaleLowerCase("fa");
    const structuralMatch = queryTokens.some((token) => structuralText.includes(token));
    const titleMatch = normalizedQuery.length > 1 && title.includes(normalizedQuery);
    return structuralMatch && (scoreHit(hit, queryTokens) >= 1.5 || (coverage >= requiredCoverage && (queryTokens.length > 1 || titleMatch)));
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

function allUserText(messages) {
  return messages.filter((message) => message.role === "user").map((message) => latestUserText([message])).filter(Boolean).join(" ");
}

export function isGreeting(query) {
  return /^(?:سلام|درود|hello|hi|hey|کمک|کمکم\s*کن|help|راهنمایی(?:\s*می‌?خوام)?)[!؟.\s]*$/iu.test(normalizeText(query));
}

function hasImageAttachment(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return (latestUserMessage?.parts || []).some((part) => part?.type === "file" && String(part.mediaType || "").startsWith("image/"));
}

const IN_SCOPE_PATTERN = /(?:هوش مصنوعی|یادگیری ماشین|یادگیری ماشینی|مدل زبان|چت‌?بات|الگوریتم|پرامپت|توکن|پردازش متن|تکنولوژی|فناوری|کامپیوتر|رایانه|برنامه‌نویسی|برنامه نویسی|کدنویسی|کد|پایتون|جاوااسکریپت|تایپ‌?اسکریپت|جاوا|php|node(?:\.js)?|react|next(?:\.js)?|vue|sql|api|sdk|http|سرور|کلود|ابری|دیتابیس|پایگاه داده|داده|شبکه|امنیت|رمزنگاری|لینوکس|ویندوز|گیت|docker|کانتینر|استقرار|دیپلوی|deploy|دامنه|dns|وب‌?سایت|سایت|اپلیکیشن|نرم‌افزار|نرم افزار|لینک|فایل|خطا|ارور|لاگ|پایگاه دانش|مستندات|documentation|لیارا|liara|پنل|حساب کاربری|سرویس|صورتحساب|فاکتور|ذخیره‌?سازی|پشتیبان|بکاپ|redis|mysql|mongodb|postgres|آی‌?پی|پورت|ssl|tls|ssh|cors|cdn|github|gitlab|اسکرین‌?شات|screenshot)/iu;
const TECHNICAL_SYMPTOM_PATTERN = /(?:برنامه\s*(?:م|ام|من)|اپلیکیشن\s*(?:م|ام|من)|سایت\s*(?:م|ام|من)|کار نمی\s*(?:کند|کنه)|درست نیست|خراب شده|مشکل دارم|خطا دارم|ارور دارم)/iu;

const GENERAL_TECHNICAL_EXPLANATION_PATTERN = /(?:چیست|چیستند|یعنی چه|چه تفاوتی|تفاوت|تعریف|معنی|چگونه کار می\s*کند|چطور کار می\s*کند|چطور(?:\s+\S+){0,8}\s*(?:ایجاد|بساز|ساخت)\s*(?:کنم|کنیم)?|چگونه(?:\s+\S+){0,8}\s*(?:ایجاد|بساز|ساخت)\s*(?:کنم|کنیم)?|توضیح بده|معرفی کن|what is|what are|difference between|how does .* work)/iu;
const LIARA_SPECIFIC_PATTERN = /(?:لیارا|liara|پنل|قیمت|پلن|صورتحساب|فاکتور|سرویس لیارا|مستندات لیارا|حساب کاربری|دامنه\s*من|دامنه\s*ام|اپلیکیشن\s*من|برنامه\s*ام|در لیارا|روی لیارا)/iu;
const LIARA_DOCUMENTED_TECHNOLOGY_PATTERN = /(?:postgres(?:ql)?|mysql|mongodb|redis|rabbitmq|prisma|sql|dbaas|paas|iaas|node(?:\.js)?|next(?:\.js)?|nest(?:\.js)?|nestjs|react|docker|python|php|github|gitlab|dns|ssl|tls|cors|websocket|cron|متغیر\s+محیطی|environment\s+variable|vercel\s+ai|ai\s+sdk|هوش\s+مصنوعی|چت‌?بات)/iu;
export function isLikelyInScope(query) {
  const normalizedQuery = normalizeText(query);
  return IN_SCOPE_PATTERN.test(normalizedQuery) || TECHNICAL_SYMPTOM_PATTERN.test(normalizedQuery);
}

function isGeneralTechnicalQuery(query) {
  const normalizedQuery = normalizeText(query);
  return isLikelyInScope(normalizedQuery)
    && GENERAL_TECHNICAL_EXPLANATION_PATTERN.test(normalizedQuery)
    && !LIARA_SPECIFIC_PATTERN.test(normalizedQuery)
    && !LIARA_DOCUMENTED_TECHNOLOGY_PATTERN.test(normalizedQuery);
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

function detectedService(query) {
  return /(?:لیارا|liara|paas|dbaas|iaas|ai|dns|email|mail|object\s*storage|ذخیره‌?سازی|دیتابیس|پایگاه\s+داده|postgres(?:ql)?|mysql|mongodb|redis|node(?:\.js)?|python|php|docker|دامنه|پنل|اپلیکیشن|سرویس)/iu.test(query);
}

function hasGoal(query) {
  const normalized = normalizeText(query);
  if (GENERAL_TECHNICAL_EXPLANATION_PATTERN.test(normalized) && tokens(normalized).length >= 2) return true;
  return tokens(normalized).length >= 4 && !/^(?:کمک|مشکل دارم|خطا|ارور|help|error)$/iu.test(normalized);
}

function hasEnvironment(query) {
  return /(?:نسخه|version|runtime|production|prod|development|dev|محیط|مرورگر|browser|ویندوز|windows(?:\s*\d+)?|chrome|firefox|edge|safari|android|ios|لینوکس|linux|macos|سیستم‌?عامل|سرور|vps|کانتینر|docker|settings|تنظیمات)/iu.test(query);
}

function hasErrorDescription(query) {
  return /(?:خطا|ارور|error|status\s*\d{3}|\b\d{3}\b|پیام|کار نمی|نمی\s*(?:شود|کند)|صفحه سفید|صفحه سیاه|رفتار)/iu.test(query);
}

export function clarificationQuestions(query) {
  const questions = [];
  if (!detectedService(query)) questions.push("مشکل مربوط به کدام سرویس یا بخش لیارا است؟");
  if (!hasGoal(query)) questions.push("می‌خواهید دقیقاً چه کاری انجام دهید یا به چه نتیجه‌ای برسید؟");
  if (needsVisualDiagnosis(query) && !hasErrorDescription(query)) questions.push("الان روی صفحه چه چیزی می‌بینید یا چه پیامی نمایش داده می‌شود؟");
  if (hasErrorDescription(query) && !hasEnvironment(query)) questions.push("این مشکل در چه محیط، نسخه یا مرورگری رخ می‌دهد؟");
  return questions.slice(0, 4);
}

function buildClarification(query) {
  const questions = clarificationQuestions(query);
  if (!questions.length) return CLARIFICATION_MESSAGE;
  return `${CLARIFICATION_MESSAGE}\n\n${questions.map((question, index) => `${index + 1}. ${question}`).join("\n")}`;
}

function understandingComplete(query, conversation) {
  const combined = normalizeText(`${conversation} ${query}`);
  const diagnostic = needsVisualDiagnosis(combined) || hasErrorDescription(combined);
  return detectedService(combined) && hasGoal(combined) && (!diagnostic || (hasErrorDescription(combined) && hasEnvironment(combined)));
}

export async function createLiaControllerPlan(messages, settings = {}) {
  const controllerSettings = {
    webSearchEnabled: settings.webSearchEnabled !== false,
    probableAnswersEnabled: settings.probableAnswersEnabled !== false,
    autoEscalationEnabled: settings.autoEscalationEnabled !== false,
    captureUnknownTopics: settings.captureUnknownTopics !== false,
  };
  const query = latestUserText(messages);
  const priorStage = previousStage(messages);
  const conversation = allUserText(messages);
  const retrievalQuery = `${conversation} ${query}`.trim();
  const contextQuery = normalizeText(`${conversation} ${query}`);

  if (isGreeting(query)) {
    return { mode: LIA_STAGES.ANSWER, stage: LIA_STAGES.ANSWER, query, hits: [], brainHits: [], searchTrace: ["greeting"], metadata: { staticAnswer: GREETING_MESSAGE } };
  }

  if (!isLikelyInScope(contextQuery)) {
    return { mode: LIA_STAGES.OUT_OF_SCOPE, stage: LIA_STAGES.OUT_OF_SCOPE, query, hits: [] };
  }

  const generalTechnical = isGeneralTechnicalQuery(contextQuery);
  const hasImage = hasImageAttachment(messages);
  if (!understandingComplete(query, conversation) && !generalTechnical) {
    const visualRequired = needsVisualDiagnosis(`${conversation} ${query}`) && !hasImage;
    if (visualRequired && priorStage !== LIA_STAGES.SCREENSHOT) {
      return {
        mode: LIA_STAGES.SCREENSHOT,
        stage: LIA_STAGES.SCREENSHOT,
        query,
        hits: [],
        searchTrace: [],
        metadata: { liaAction: "screenshot", screenshotReason: "برای دیدن خطا یا وضعیت صفحه" },
        message: SCREENSHOT_MESSAGE,
      };
    }
    return {
      mode: LIA_STAGES.CLARIFICATION,
      stage: LIA_STAGES.CLARIFICATION,
      query,
      hits: [],
      searchTrace: [],
      message: buildClarification(contextQuery),
    };
  }

  const searchTrace = ["brain"];
  let brainHits = [];
  try {
    brainHits = await searchKnowledge(query);
    if (!isStrongKnowledgeEvidence(brainHits, query) && conversation !== query) brainHits = await searchKnowledge(retrievalQuery);
  } catch { brainHits = []; }
  if (isStrongKnowledgeEvidence(brainHits, query) || isStrongKnowledgeEvidence(brainHits, retrievalQuery)) {
    return { mode: LIA_STAGES.ANSWER, stage: LIA_STAGES.ANSWER, query, hits: [], brainHits, searchTrace, includeSources: !generalTechnical };
  }

  searchTrace.push("local_docs");
  const local = await searchDocumentation(`${conversation} ${query}`);
  let hits = local.hits;
  let documentationAvailable = local.available;

  searchTrace.push("meilisearch_docs");
  if (shouldSearchOnline(hits, query)) {
    const online = await searchDocumentationOnline(query);
    documentationAvailable = documentationAvailable || online.available;
    hits = mergeHits(hits, online.hits);
  }

  if (isStrongEvidence(hits, retrievalQuery)) {
    return {
      mode: LIA_STAGES.ANSWER,
      stage: LIA_STAGES.ANSWER,
      query,
      hits,
      brainHits,
      searchTrace,
      includeSources: !generalTechnical,
    };
  }

  if (controllerSettings.webSearchEnabled) {
    searchTrace.push("web");
    const web = await searchWeb(`${conversation} ${query}`);
    if (web.available) hits = mergeHits(hits, web.hits);
    documentationAvailable = documentationAvailable || web.available;
    if (isStrongEvidence(hits, retrievalQuery)) {
      return { mode: LIA_STAGES.ANSWER, stage: LIA_STAGES.ANSWER, query, hits, brainHits, searchTrace, includeSources: !generalTechnical };
    }
  }

  if (generalTechnical) {
    if (controllerSettings.probableAnswersEnabled) {
      return { mode: LIA_STAGES.PROBABLE, stage: LIA_STAGES.PROBABLE, query, hits, brainHits, searchTrace, documentationAvailable };
    }
  }

  const unresolvedMode = controllerSettings.autoEscalationEnabled ? LIA_STAGES.ESCALATED : LIA_STAGES.UNANSWERED;
  return {
    mode: unresolvedMode,
    stage: unresolvedMode,
    query,
    clarifiedQuestion: `${conversation} ${query}`.trim().slice(0, 5000),
    hits,
    brainHits,
    searchTrace,
    documentationAvailable,
    metadata: { capturedUnknown: controllerSettings.captureUnknownTopics },
  };
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
