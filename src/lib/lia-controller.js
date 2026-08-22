import { documentationQueryTokens, matchesDocumentationToken, redactSensitiveText, searchDocumentation, searchDocumentationOnline } from "@/lib/docs-search";
import { searchKnowledge } from "@/lib/lia-brain";
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
const MIN_SOURCE_CONFIDENCE = 0.6;
const SOURCE_CONFIDENCE_NOISE = new Set(["صفحه", "مورد", "مشکل", "ارور", "خطا", "کار", "درست", "این", "آن", "همین", "شده", "شد", "است", "هست", "نمی", "نمیشه", "نمی‌شود", "کند", "کنه"]);

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

function buildScreenshotRequest(query) {
  const questions = clarificationQuestions(query).slice(0, 2);
  const initialQuestions = questions.length
    ? questions.map((question, index) => `${index + 1}. ${question}`).join("\n")
    : "1. متن کامل خطا، آخرین تغییر انجام‌شده و نام سرویس یا بخش مربوط را بنویسید.";
  return `## پرسش اولیه\n\nبرای اینکه از روی اطلاعات موجود مسیر درست را مشخص کنم، ابتدا این موارد را بگویید:\n${initialQuestions}\n\n${SCREENSHOT_MESSAGE}`;
}

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
  const haystack = new Set(tokens(`${hit.title || ""} ${hit.section || ""} ${hit.path || ""} ${hit.body || ""}`));
  return queryTokens.filter((token) => matchesDocumentationToken(token, haystack)).length;
}

function sourceConfidence(hit, query) {
  const queryTokens = documentationQueryTokens(query).filter((token) => !SOURCE_CONFIDENCE_NOISE.has(token));
  if (!queryTokens.length) return 0;
  return hitCoverage(hit, queryTokens) / queryTokens.length;
}

function bestSourceConfidence(hits, query) {
  return Math.max(0, ...hits.map((hit) => sourceConfidence(hit, query)));
}

function isStrongEvidence(hits, query) {
  return bestSourceConfidence(hits, query) >= MIN_SOURCE_CONFIDENCE;
}

function knowledgeConfidence(entry, query) {
  const queryTokens = [...new Set(tokens(query))].filter((token) => !SOURCE_CONFIDENCE_NOISE.has(token));
  if (!queryTokens.length) return 0;
  const haystack = new Set(tokens(`${entry.question || ""} ${entry.answer || ""}`));
  return queryTokens.filter((token) => haystack.has(token)).length / queryTokens.length;
}

function bestKnowledgeConfidence(entries, query) {
  return Math.max(0, ...entries.map((entry) => knowledgeConfidence(entry, query)));
}

function mergeHits(...groups) {
  const merged = new Map();
  for (const hit of groups.flat()) {
    const key = `${hit.url || hit.path || hit.title}|${hit.section || ""}`;
    const existing = merged.get(key);
    if (!existing || (hit.score || 0) > (existing.score || 0)) merged.set(key, hit);
  }
  return [...merged.values()].sort((a, b) => (b.score || 0) - (a.score || 0));
}

function previousStage(messages) {
  const assistant = [...messages].reverse().find((message) => message.role === "assistant");
  return assistant?.metadata?.liaStage;
}

function allUserText(messages) {
  return messages.filter((message) => message.role === "user").map((message) => latestUserText([message])).filter(Boolean).join(" ");
}

function retrievalText(messages, latestQuery) {
  const userTexts = messages
    .filter((message) => message.role === "user")
    .map((message) => latestUserText([message]))
    .filter(Boolean);
  const prior = userTexts.slice(0, -1).slice(-2);
  if (!prior.length || !shouldUseConversationContext(latestQuery)) return latestQuery.trim().slice(0, 6000);
  return [...prior, latestQuery].join(" ").trim().slice(0, 6000);
}

export function isGreeting(query) {
  return /^(?:سلام|درود|hello|hi|hey|کمک|کمکم\s*کن|help|راهنمایی(?:\s*می‌?خوام)?)[!؟.\s]*$/iu.test(normalizeText(query));
}

function hasImageAttachment(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return (latestUserMessage?.parts || []).some((part) => part?.type === "file" && String(part.mediaType || "").startsWith("image/"));
}

const IN_SCOPE_PATTERN = /(?:هوش مصنوعی|یادگیری ماشین|یادگیری ماشینی|مدل زبان|چت‌?بات|الگوریتم|پرامپت|توکن|پردازش متن|تکنولوژی|فناوری|کامپیوتر|رایانه|برنامه‌نویسی|برنامه نویسی|کدنویسی|کد|پایتون|جاوااسکریپت|تایپ‌?اسکریپت|جاوا|php|node(?:\.js)?|react|next(?:\.js)?|vue|sql|api|sdk|http|سرور|کلود|ابری|دیتابیس|پایگاه داده|داده|شبکه|امنیت|رمزنگاری|لینوکس|ویندوز|گیت|docker|کانتینر|استقرار|دیپلوی|deploy|دامنه|dns|وب‌?سایت|سایت|اپلیکیشن|نرم‌افزار|نرم افزار|لینک|فایل|خطا|ارور|لاگ|پایگاه دانش|مستندات|documentation|لیارا|liara|پنل|حساب کاربری|سرویس|صورتحساب|فاکتور|ذخیره‌?سازی|پشتیبان|بکاپ|redis|mysql|mongodb|postgres|آی‌?پی|پورت|ssl|tls|ssh|cors|cdn|github|gitlab|اسکرین‌?شات|screenshot)/iu;
const TECHNICAL_SYMPTOM_PATTERN = /(?:برنامه\s*(?:م|ام|من)|اپلیکیشن\s*(?:م|ام|من)|سایت\s*(?:م|ام|من)|کار نمی\s*(?:کند|کنه)|درست نیست|خراب شده|مشکل دارم|خطا دارم|ارور دارم|صفحه\s+(?:سفید|سیاه)|اسکرین\s*شات)/iu;
const TECHNICAL_ENTITY_PATTERN = /(?:api|api\s*key|cli|sdk|http|graphql|docker|redis|mysql|mongodb|postgres(?:ql)?|ssh|node(?:\.js)?|python|php|react|next(?:\.js)?|dns|ssl|tls|cors|cdn|github|gitlab|دیتابیس|پایگاه داده|استقرار|دیپلوی|deploy|دامنه|سرور|لیارا|liara)/iu;
const QUERY_ACTION_PATTERN = /(?:چطور|چطوری|چگونه|نحوه|میخوام|می\s+خوام|بگیرم|گرفتن|دریافت|استفاده|ساخت|ایجاد|مستندات|راهنما|چیست|معرفی)/iu;
const QUERY_CONTEXT_REFERENCE_PATTERN = /(?:این|همین|آن|اون|همان|ادامه|قبلی|بالا|این مورد|همین مورد|چطورش|پس)/iu;

const GENERAL_TECHNICAL_EXPLANATION_PATTERN = /(?:چیست|چیستند|یعنی چه|چه تفاوتی|تفاوت|تعریف|معنی|چگونه کار می\s*کند|چطور کار می\s*کند|چطور(?:\s+\S+){0,8}\s*(?:ایجاد|بساز|ساخت)\s*(?:کنم|کنیم)?|چگونه(?:\s+\S+){0,8}\s*(?:ایجاد|بساز|ساخت)\s*(?:کنم|کنیم)?|توضیح بده|معرفی کن|what is|what are|difference between|how does .* work)/iu;
const LIARA_SPECIFIC_PATTERN = /(?:لیارا|liara|پنل|قیمت|پلن|صورتحساب|فاکتور|سرویس لیارا|مستندات لیارا|حساب کاربری|دامنه\s*من|دامنه\s*ام|اپلیکیشن\s*من|برنامه\s*ام|در لیارا|روی لیارا)/iu;
const LIARA_DOCUMENTED_TECHNOLOGY_PATTERN = /(?:dbaas|paas|iaas|rabbitmq|prisma|nestjs|vercel\s+ai|ai\s+sdk|متغیر\s+محیطی|environment\s+variable)/iu;
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

function shouldUseConversationContext(query) {
  const normalized = normalizeText(query);
  return tokens(normalized).length <= 2 || QUERY_CONTEXT_REFERENCE_PATTERN.test(normalized) || !TECHNICAL_ENTITY_PATTERN.test(normalized);
}

function detectedService(query) {
  return TECHNICAL_ENTITY_PATTERN.test(query) || /(?:لیارا|liara|paas|dbaas|iaas|ai|dns|email|mail|object\s*storage|ذخیره‌?سازی|پایگاه\s+داده|دامنه|پنل|اپلیکیشن|سرویس)/iu.test(query);
}

function hasGoal(query) {
  const normalized = normalizeText(query);
  if (GENERAL_TECHNICAL_EXPLANATION_PATTERN.test(normalized) && tokens(normalized).length >= 2) return true;
  if (TECHNICAL_ENTITY_PATTERN.test(normalized) && (tokens(normalized).length <= 3 || QUERY_ACTION_PATTERN.test(normalized))) return true;
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

function understandingComplete(query) {
  const normalizedQuery = normalizeText(query);
  const diagnostic = needsVisualDiagnosis(normalizedQuery) || hasErrorDescription(normalizedQuery);
  return detectedService(normalizedQuery) && hasGoal(normalizedQuery) && (!diagnostic || (hasErrorDescription(normalizedQuery) && hasEnvironment(normalizedQuery)));
}

const SECURITY_RISK_PATTERN = /(?:\brm\s+-rf\b|docker\s+system\s+prune(?:\s+-a)?|\b(?:drop|truncate)\s+(?:database|table|schema|index)\b|\bdelete\s+(?:from|database|table|schema|index|data|records)\b|git\s+(?:push\s+--force(?:-with-lease)?|reset\s+--hard)|kubectl\s+delete\s+.*--all|(?:liara|aws|gcloud)\s+.*\b(?:delete|destroy|terminate)\b|(?:حذف|پاک\s*کردن|پاکسازی|بازنشانی|ریست|overwrite|flush|force\s*push).{0,80}(?:دیتابیس|پایگاه\s*داده|جدول|فایل|اطلاعات|سرویس|داده|حساب|دسترسی|سرور)|(?:دور\s*زدن|bypass).{0,50}(?:امنیت|احراز|مجوز|authentication|authorization|auth)|(?:افشا|نمایش|ارسال|ارائه).{0,50}(?:رمز|password|token|api[_ -]?key|secret|کلید\s*خصوصی|system\s*prompt|پرامپت\s*سیستم))/iu;

function securityRisk(query) {
  return SECURITY_RISK_PATTERN.test(normalizeText(query))
    ? { required: true, reason: "security_risk" }
    : null;
}

async function createLiaControllerPlanInternal(messages, settings = {}) {
  const controllerSettings = {
    webSearchEnabled: settings.webSearchEnabled !== false,
    probableAnswersEnabled: settings.probableAnswersEnabled !== false,
    autoEscalationEnabled: settings.autoEscalationEnabled !== false,
    captureUnknownTopics: settings.captureUnknownTopics !== false,
  };
  const query = latestUserText(messages);
  const priorStage = previousStage(messages);
  const conversation = allUserText(messages);
  const retrievalQuery = retrievalText(messages, query);
  const contextQuery = retrievalText(messages, query);
  const hasImage = hasImageAttachment(messages);

  if (isGreeting(query)) {
    return { mode: LIA_STAGES.ANSWER, stage: LIA_STAGES.ANSWER, query, hits: [], brainHits: [], searchTrace: ["greeting"], classification: "greeting", decision: "static_answer", reason: "greeting", sourceConfidence: 0, metadata: { staticAnswer: GREETING_MESSAGE } };
  }

  const risk = securityRisk(query);
  if (risk) {
    return {
      mode: LIA_STAGES.ESCALATED,
      stage: LIA_STAGES.ESCALATED,
      query,
      clarifiedQuestion: query.slice(0, 5000),
      hits: [],
      brainHits: [],
      searchTrace: ["security_gate"],
      classification: "security_risk",
      decision: "admin_review_required",
      reason: risk.reason,
      sourceConfidence: 0,
      securityRisk: true,
      metadata: { securityRisk: true, capturedUnknown: false },
    };
  }

  if (!isLikelyInScope(contextQuery) && !hasImage) {
    return { mode: LIA_STAGES.OUT_OF_SCOPE, stage: LIA_STAGES.OUT_OF_SCOPE, query, hits: [], brainHits: [], searchTrace: [], classification: "out_of_scope", decision: "out_of_scope", reason: "outside_liara_domain", sourceConfidence: 0 };
  }

  const generalTechnical = isGeneralTechnicalQuery(contextQuery) || hasImage;
  const visualRequired = needsVisualDiagnosis(`${conversation} ${query}`) && !hasImage;
  const screenshotFollowup = hasImage && priorStage === LIA_STAGES.SCREENSHOT;
  if (!understandingComplete(contextQuery) && !generalTechnical && !visualRequired && !screenshotFollowup) {
    return {
      mode: LIA_STAGES.CLARIFICATION,
      stage: LIA_STAGES.CLARIFICATION,
      query,
      hits: [],
      searchTrace: [],
      classification: "liara_diagnostic",
      decision: "clarify_question",
      reason: "insufficient_context",
      sourceConfidence: 0,
      message: buildClarification(contextQuery),
    };
  }

  const searchTrace = ["brain"];
  let brainHits = [];
  try {
    const directBrainHits = await searchKnowledge(query);
    brainHits = bestKnowledgeConfidence(directBrainHits, query) >= MIN_SOURCE_CONFIDENCE
      ? directBrainHits
      : await searchKnowledge(retrievalQuery);
  } catch { brainHits = []; }
  const brainConfidence = Math.max(bestKnowledgeConfidence(brainHits, query), bestKnowledgeConfidence(brainHits, retrievalQuery));
  if (brainConfidence >= MIN_SOURCE_CONFIDENCE) {
    return {
      mode: LIA_STAGES.ANSWER,
      stage: LIA_STAGES.ANSWER,
      query,
      hits: [],
      brainHits,
      searchTrace,
      classification: "liara_documented",
      decision: "answer_from_source",
      reason: "knowledge_source_confident",
      sourceConfidence: brainConfidence,
      includeSources: !generalTechnical,
      metadata: visualRequired ? {
        liaAction: "screenshot",
        requestScreenshot: true,
        screenshotReason: "برای تطبیق راهنمای اولیه با وضعیت واقعی صفحه",
      } : undefined,
    };
  }
  brainHits = [];

  searchTrace.push("local_docs");
  const local = await searchDocumentation(retrievalQuery);
  let hits = local.hits;
  let documentationAvailable = local.available;

  searchTrace.push("meilisearch_docs");
  if (shouldSearchOnline(hits, query)) {
    const online = await searchDocumentationOnline(query);
    documentationAvailable = documentationAvailable || online.available;
    hits = mergeHits(hits, online.hits);
  }

  if (isStrongEvidence(hits, retrievalQuery)) {
    const sourceConfidenceValue = Math.max(bestSourceConfidence(hits, query), bestSourceConfidence(hits, retrievalQuery));
    return {
      mode: LIA_STAGES.ANSWER,
      stage: LIA_STAGES.ANSWER,
      query,
      hits,
      brainHits,
      searchTrace,
      classification: "liara_documented",
      decision: "answer_from_source",
      reason: "documentation_source_confident",
      sourceConfidence: sourceConfidenceValue,
      includeSources: !generalTechnical,
      metadata: visualRequired ? {
        liaAction: "screenshot",
        requestScreenshot: true,
        screenshotReason: "برای تطبیق راهنمای اولیه با وضعیت واقعی صفحه",
      } : undefined,
    };
  }

  if (controllerSettings.webSearchEnabled) {
    searchTrace.push("liara_web");
    const web = await searchWeb(`${conversation} ${query}`);
    if (web.available) hits = mergeHits(hits, web.hits);
    documentationAvailable = documentationAvailable || web.available;
    if (isStrongEvidence(hits, retrievalQuery)) {
      const sourceConfidenceValue = Math.max(bestSourceConfidence(hits, query), bestSourceConfidence(hits, retrievalQuery));
      return {
        mode: LIA_STAGES.ANSWER,
        stage: LIA_STAGES.ANSWER,
        query,
        hits,
        brainHits,
        searchTrace,
        classification: "liara_documented",
        decision: "answer_from_source",
        reason: "liara_search_source_confident",
        sourceConfidence: sourceConfidenceValue,
        includeSources: !generalTechnical,
        metadata: visualRequired ? {
          liaAction: "screenshot",
          requestScreenshot: true,
          screenshotReason: "برای تطبیق راهنمای اولیه با وضعیت واقعی صفحه",
        } : undefined,
      };
    }
  }

  if (visualRequired) {
    return {
      mode: LIA_STAGES.SCREENSHOT,
      stage: LIA_STAGES.SCREENSHOT,
      query,
      hits,
      brainHits,
      searchTrace,
      classification: "liara_diagnostic",
      decision: "request_screenshot",
      reason: "visual_diagnosis_required_after_retrieval",
      sourceConfidence: Math.max(bestSourceConfidence(hits, retrievalQuery), brainConfidence),
      metadata: { liaAction: "screenshot", screenshotReason: "برای دیدن خطا یا وضعیت صفحه" },
      message: buildScreenshotRequest(contextQuery),
    };
  }

  if (generalTechnical) {
    if (controllerSettings.probableAnswersEnabled) {
      return {
        mode: LIA_STAGES.PROBABLE,
        stage: LIA_STAGES.PROBABLE,
        query,
        hits,
        brainHits,
        searchTrace,
        classification: hasImage ? "image_assisted" : "general_technical",
        decision: "general_safe_answer",
        reason: "no_internal_source_above_threshold",
        sourceConfidence: Math.max(bestSourceConfidence(hits, retrievalQuery), brainConfidence),
        documentationAvailable,
      };
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
    classification: "liara_specific_unverified",
    decision: unresolvedMode === LIA_STAGES.ESCALATED ? "admin_review_required" : "unanswered",
    reason: "no_internal_source_above_threshold",
    sourceConfidence: Math.max(bestSourceConfidence(hits, retrievalQuery), brainConfidence),
    documentationAvailable,
    metadata: { capturedUnknown: controllerSettings.captureUnknownTopics },
  };
}

function debugHit(hit) {
  return {
    path: hit.path,
    url: hit.url,
    section: redactSensitiveText(hit.section),
    score: Number.isFinite(Number(hit.score)) ? Number(hit.score.toFixed(4)) : undefined,
    coverage: hit.coverage,
    confidence: hit.confidence,
  };
}

export async function createLiaControllerPlan(messages, settings = {}) {
  const plan = await createLiaControllerPlanInternal(messages, settings);
  const query = latestUserText(messages);
  const retrievalQueryValue = retrievalText(messages, query);
  return {
    ...plan,
    debugTrace: {
      query: redactSensitiveText(query).slice(0, 6000),
      retrievalQuery: redactSensitiveText(retrievalQueryValue).slice(0, 6000),
      searchTrace: plan.searchTrace || [],
      decision: plan.decision,
      stage: plan.stage,
      sourceConfidence: plan.sourceConfidence,
      sources: (plan.hits || []).map(debugHit),
      knowledgeSources: (plan.brainHits || []).map((entry) => ({
        id: entry.id,
        question: redactSensitiveText(entry.question).slice(0, 500),
      })),
    },
  };
}

const INTERNAL_OUTPUT_PATTERN = /system prompt|developer message|internal reasoning|زنجیرهٔ فکر|تحلیل داخلی|پرامپت\s*سیستم|قوانین\s*داخلی|دستورهای\s*داخلی|افشای\s+دستور/i;
const SECRET_OUTPUT_PATTERN = /(?:api[_-]?key|token|secret|password|رمز(?:\s*عبور)?|کلید(?:\s+خصوصی)?|پسورد)\s*[:=]\s*(?:["'`][^"'`\r\n]{8,}["'`]|(?=[A-Za-z0-9._~+/=-]{20,}(?:\s|$))(?=[A-Za-z0-9._~+/=-]*\d)[A-Za-z0-9._~+/=-]{20,})|\b(?:bearer|basic)\s+(?=[A-Za-z0-9._~+/=-]{20,}(?:\s|$))(?=[A-Za-z0-9._~+/=-]*\d)[A-Za-z0-9._~+/=-]{20,}|(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^\s`'"<>]+|-----BEGIN [^-]+ PRIVATE KEY-----/iu;
const DANGEROUS_COMMAND_PATTERN = /(?:\brm\s+-rf\b|docker\s+system\s+prune(?:\s+-a)?|\b(?:drop|truncate)\s+(?:database|table|schema|index)\b|\bdelete\s+(?:from|database|table|schema|index|data|records)\b|git\s+(?:push\s+--force(?:-with-lease)?|reset\s+--hard)|kubectl\s+delete\s+.*--all|(?:liara|aws|gcloud)\s+.*\b(?:delete|destroy|terminate)\b)/iu;

export function isUnsafeLiaDraft(text) {
  const value = String(text || "");
  return INTERNAL_OUTPUT_PATTERN.test(value) || SECRET_OUTPUT_PATTERN.test(value) || DANGEROUS_COMMAND_PATTERN.test(value);
}

export function validateLiaDraft(text) {
  const value = String(text || "").trim();
  if (!value || value.length > 12000) return false;
  if (!/^##\s*پاسخ(?:\s|$)/u.test(value)) return false;
  const prose = value.replace(/```[\s\S]*?```/g, "");
  if (/##\s*منبع پاسخ|<documentation-source|https?:\/\/|www\./i.test(prose)) return false;
  if (/\[[^\]]+\]\((?:https?:\/\/|\/)/i.test(prose)) return false;
  if (isUnsafeLiaDraft(value)) return false;
  return true;
}
