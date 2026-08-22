import fs from "node:fs/promises";
import path from "node:path";
import MeiliSearch from "meilisearch";

const MAX_RESULTS = 4;
const MAX_BODY_LENGTH = 3600;
const MAX_CONTEXT_LENGTH = 12000;
const CHUNK_LENGTH = 2200;
const CHUNK_OVERLAP = 180;
const DOCUMENTATION_ROOTS = ["public/llms"];
const ONLINE_INDEX = "docs";
const DATABASE_QUERY_PATTERN = /(?:دیتابیس|پایگاه\s+داده|database|postgres(?:ql)?|mysql|mariadb|mongodb|mongo|redis|rabbitmq|elasticsearch|elastic\s*search|mssql|sql\s*server|sqlite|بکاپ|backup|بازیابی|restore|connection\s*pool|اتصال\s+به\s+(?:دیتابیس|پایگاه))/iu;
const SEARCH_STOP_WORDS = new Set(["به", "در", "برای", "با", "از", "و", "را", "یک", "این", "آن", "برنامه", "روش", "است", "های", "کردن"]);
const QUERY_NOISE_WORDS = new Set(["چطور", "چطوری", "چگونه", "نحوه", "میخوام", "می", "خوام", "خواهم", "بگیرم", "گرفتن", "دریافت", "استفاده", "کنم", "کنیم", "میشه", "شود", "کنه", "کند", "چیست", "چیه", "یعنی", "مستندات", "راهنما", "راهنمایی", "کجا", "کار", "رو", "بیارم", "بسازم", "بساز", "ساختن", "یاد", "یادگیری", "یادبگیرم", "یادگرفتن", "آموزش", "آموزشی", "دوره", "شروع", "مسیر"]);
const SEARCH_ALIAS_REPLACEMENTS = [
  [/\bnext\s*(?:[._-]\s*)?js\b/giu, "nextjs"],
  [/\bnode\s*(?:[._-]\s*)?js\b/giu, "nodejs"],
  [/\bnest\s*(?:[._-]\s*)?js\b/giu, "nestjs"],
  [/\bpostgre\s*sql\b/giu, "postgresql"],
  [/\bmongo\s*db\b/giu, "mongodb"],
  [/\btype\s*script\b/giu, "typescript"],
  [/\bjava\s*script\b/giu, "javascript"],
];
const LEARNING_QUERY_PATTERN = /(?:یاد\s*(?:بگیرم|بگیری|گرفتن)?|یادگیری|آموزش|آموزشی|دوره|مسیر|شروع\s+به\s+کار|getting\s*started|learn|learning|tutorial)/iu;
const LEARNING_DOCUMENT_TYPES = new Set(["getting-started", "quick-start", "create-app", "deploy-app"]);
const DOCUMENTATION_HOST_PATTERN = /(?:^|\.)liara\.ir$/i;
let documentsPromise;
let onlineClient;
let prismaPromise;

async function getPrisma() {
  if (!process.env.DATABASE_URL) return null;
  prismaPromise ||= import("./prisma.js").then(({ prisma }) => prisma);
  return prismaPromise;
}

export function normalizeText(value) {
  return String(value || "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchQuery(value) {
  return SEARCH_ALIAS_REPLACEMENTS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), normalizeText(value));
}

function tokens(value) {
  return (normalizeSearchQuery(value).toLocaleLowerCase("fa").match(/[\p{L}\p{N}]+(?:[._-][\p{L}\p{N}]+)*/gu) || [])
    .filter((token) => !SEARCH_STOP_WORDS.has(token));
}

const QUERY_SYNONYMS = [
  [/\bdeploy(?:ment)?\b|استقرار|دیپلوی/iu, "deploy deployment استقرار دیپلوی"],
  [/\bnode(?:\.js)?\b|نود/iu, "node nodejs node.js نود"],
  [/\bapi\b|\bapi key\b|کلید\s+(?:دسترسی|api)/iu, "api api-key http endpoint token کلید دسترسی"],
  [/\btoken\b|توکن/iu, "token توکن api-key کلید دسترسی"],
  [/\bcli\b|خط\s*فرمان/iu, "cli command line خط فرمان"],
  [/\bdocker\b|داکر/iu, "docker container کانتینر داکر"],
  [/\bssh\b/iu, "ssh سرور دسترسی"],
  [/\bdomain\b|دامنه/iu, "domain domains دامنه dns رکورد"],
  [/\bdns\b|دی\s*ان\s*اس/iu, "dns domain domains رکورد"],
  [/postgres(?:ql)?|پستگرس/iu, "postgres postgresql پستگرس database دیتابیس"],
  [/\bredis\b|ردیس/iu, "redis ردیس database دیتابیس"],
  [/\bbackup\b|بکاپ|پشتیبان|restore|بازیابی/iu, "backup restore بکاپ پشتیبان بازیابی"],
  [/\blog(?:s)?\b|لاگ/iu, "log logs لاگ"],
  [/\bmonitor(?:ing)?\b|مانیتورینگ|نظارت/iu, "monitor monitoring health check metrics مانیتورینگ سلامت"],
  [/\bauth(?:entication)?\b|احراز\s+هویت|ورود/iu, "auth authentication احراز هویت ورود login"],
  [/\bbilling\b|صورتحساب|فاکتور/iu, "billing invoice صورتحساب فاکتور پرداخت"],
  [/\bproject(?:s)?\b|پروژه/iu, "project projects پروژه اپلیکیشن application"],
  [/\bconnect(?:ion)?\b|وصل|اتصال/iu, "connect connection وصل اتصال"],
  [/\bapp(?:lication)?s?\b|اپلیکیشن|برنامه/iu, "app apps application applications اپلیکیشن برنامه"],
  [/\btroubleshoot(?:ing)?\b|عیب\s*یابی|خطا/iu, "troubleshooting error خطا مشکل راهکار"],
  [/\bsetup\b|راه\s*اندازی|نصب/iu, "setup quick-start quick-setup راه اندازی نصب"],
  [/\bplan\b|پلن|قیمت/iu, "plan pricing price پلن قیمت"],
  [/database|postgres(?:ql)?|mysql|mongodb|redis|دیتابیس|پایگاه\s+داده/iu, "database دیتابیس پایگاه داده postgres postgresql mysql mongodb redis"],
  [/error|خطا|ارور|exception|مشکل/iu, "error خطا ارور exception مشکل"],
  [/env|environment|محیط|متغیر\s+محیطی/iu, "env environment محیط متغیر محیطی"],
];

function tokenVariants(token) {
  const match = QUERY_SYNONYMS.find(([pattern, value]) => pattern.test(token));
  const variants = match ? tokens(match[1]) : [token];
  const stem = token.replace(/(?:مان|تان|شان|ها|ش|م|ت)$/u, "");
  return stem.length >= 3 && stem !== token ? [...new Set([...variants, stem])] : variants;
}

function queryTokens(value) {
  return [...new Set(tokens(value).filter((token) => !QUERY_NOISE_WORDS.has(token) || TECHNICAL_TERM_PATTERN.test(token)))];
}

function matchesToken(token, values) {
  const valueSet = values instanceof Set ? values : new Set(values);
  return tokenVariants(token).some((variant) => valueSet.has(variant));
}

export function matchesDocumentationToken(token, values) {
  return matchesToken(token, values);
}

async function findFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findFiles(fullPath));
    else if (/\.(md|mdx|html?)$/i.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function cleanMarkdown(content) {
  return String(content || "")
    .replace(/^\uFEFF?Original link:\s*\S+\s*$/gim, "")
    .replace(/^import\s.+$/gm, "")
    .replace(/^export\s.+$/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[\r\n]+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function titleFrom(content, filePath) {
  const heading = content.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim();
  return heading ? normalizeText(heading.replace(/[*_`]/g, "")) : path.basename(filePath, path.extname(filePath)).replace(/[-_]/g, " ");
}

function docsUrl(content) {
  const originalLink = content.match(/^\uFEFF?Original link:\s*(\S+)/mi)?.[1];
  return isValidDocumentationUrl(originalLink) ? originalLink : null;
}

function imageUrlFrom(content) {
  const image = String(content || "").match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
    || String(content || "").match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/i)?.[1];
  return image && /^(?:https?:\/\/|\/)/i.test(image) ? image : null;
}

function documentationMetadata(sourcePath) {
  const normalizedPath = String(sourcePath || "").replaceAll("\\", "/");
  const parts = normalizedPath.split("/");
  const llmsIndex = parts.indexOf("llms");
  const relativeParts = llmsIndex >= 0 ? parts.slice(llmsIndex + 1) : parts;
  const category = relativeParts[0] || null;
  const service = relativeParts[1] || category || null;
  const documentType = relativeParts.at(-1)?.replace(/\.(?:md|mdx|html?)$/i, "") || null;
  return { category, service, documentType };
}

function splitTextSafely(text) {
  const chunks = [];
  let remaining = String(text || "").trim();
  while (remaining) {
    if (remaining.length <= CHUNK_LENGTH) {
      chunks.push(remaining);
      break;
    }
    let cut = remaining.lastIndexOf("\n", CHUNK_LENGTH);
    if (cut < CHUNK_LENGTH * 0.55) cut = remaining.lastIndexOf(" ", CHUNK_LENGTH);
    if (cut < CHUNK_LENGTH * 0.55) cut = CHUNK_LENGTH;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(Math.max(cut - CHUNK_OVERLAP, 0)).trim();
  }
  return chunks.filter(Boolean);
}

function splitIntoChunks(content, fallbackTitle) {
  const lines = cleanMarkdown(content).split(/\r?\n/);
  const chunks = [];
  let section = fallbackTitle;
  let buffer = [];
  let inCodeFence = false;

  const flush = () => {
    const text = buffer.join("\n").trim();
    buffer = [];
    if (!text) return;
    for (const piece of splitTextSafely(text)) {
      const body = normalizeText(piece);
      if (body) chunks.push({ section, body });
    }
  };

  for (const line of lines) {
    const heading = !inCodeFence ? line.match(/^#{1,4}\s+(.+)$/)?.[1] : null;
    if (heading) {
      flush();
      const nextSection = normalizeText(heading.replace(/[*_`]/g, "")) || fallbackTitle;
      if (/^all\s+links?$/iu.test(nextSection)) break;
      section = nextSection;
    } else {
      buffer.push(line);
    }
    if (/^\s*```/.test(line)) inCodeFence = !inCodeFence;
    if (!inCodeFence && !line.trim()) flush();
  }
  flush();
  return chunks.length ? chunks : [{ section: fallbackTitle, body: normalizeText(cleanMarkdown(content)) }];
}

export async function loadDocuments() {
  const allFiles = [];
  for (const root of DOCUMENTATION_ROOTS) {
    try { allFiles.push(...await findFiles(path.join(process.cwd(), root))); } catch { /* optional source root */ }
  }

  const documents = [];
  const seen = new Set();
  for (const filePath of allFiles) {
    const raw = await fs.readFile(filePath, "utf8");
    const relativePath = path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
    const title = titleFrom(raw, filePath);
    const url = docsUrl(raw);
    for (const chunk of splitIntoChunks(raw, title)) {
      const body = chunk.body.slice(0, MAX_BODY_LENGTH);
      if (!body) continue;
      const dedupeKey = `${url || relativePath}|${chunk.section}|${body}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      documents.push({
        title,
        path: relativePath,
        url,
        imageUrl: imageUrlFrom(raw),
        rawContent: raw,
        section: chunk.section,
        body,
        titleTokens: tokens(title),
        sectionTokens: tokens(chunk.section),
        bodyTokens: new Set(tokens(body)),
        pathTokens: tokens(relativePath),
        ...documentationMetadata(relativePath),
      });
    }
  }
  return documents;
}

function searchableDocument(document) {
  return {
    ...document,
    titleTokens: tokens(document.title),
    sectionTokens: tokens(document.section),
    bodyTokens: new Set(tokens(document.body)),
    pathTokens: tokens(document.path),
    ...documentationMetadata(document.path),
  };
}

function scoreDocument(document, query, queryTokens) {
  const normalizedQuery = normalizeText(query).toLocaleLowerCase("fa");
  const matchingTokens = queryTokens.filter((token) => matchesToken(token, document.bodyTokens));
  const titleMatches = queryTokens.filter((token) => matchesToken(token, document.titleTokens)).length;
  const sectionMatches = queryTokens.filter((token) => matchesToken(token, document.sectionTokens)).length;
  const pathMatches = queryTokens.filter((token) => matchesToken(token, document.pathTokens)).length;
  const metadataTokens = tokens(`${document.category || ""} ${document.service || ""} ${document.documentType || ""}`);
  const metadataMatches = queryTokens.filter((token) => matchesToken(token, metadataTokens)).length;
  const structuralMatches = titleMatches + sectionMatches + pathMatches + metadataMatches;
  let score = (matchingTokens.length / Math.max(queryTokens.length, 1)) * 2;
  if (normalizedQuery.length > 3 && document.title.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 4;
  if (normalizedQuery.length > 3 && document.section.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 2.5;
  if (normalizedQuery.length > 5 && document.body.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 2;
  score += titleMatches * 2.2 + sectionMatches * 1.6 + pathMatches;
  score += metadataMatches * 2.4;
  if (document.category === "references" && document.documentType === "about") score += 4;
  if (LEARNING_QUERY_PATTERN.test(query)) {
    score += ({
      "getting-started": 6,
      "quick-start": 4,
      "create-app": 3,
      "deploy-app": 2,
      "related-links": 1,
    }[document.documentType] || 0);
  }
  score += documentationDomainBoost(document.path, query);
  score += Number(document.dbScore || 0) * 0.35;
  return { document, score, coverage: matchingTokens.length, structuralMatches };
}

function rankDocuments(documents, query) {
  const queryTokens = queryTokensForSearch(query);
  const minimumCoverage = queryTokens.length === 1
    ? 1
    : queryTokens.length <= 5
      ? Math.ceil(queryTokens.length * 0.67)
      : Math.max(2, Math.ceil(queryTokens.length * 0.35));
  const ranked = documents
    .map((document) => scoreDocument(searchableDocument(document), query, queryTokens))
    .filter(({ coverage, structuralMatches }) => coverage >= minimumCoverage && (structuralMatches > 0 || coverage >= 2))
    .sort((a, b) => b.score - a.score);
  const bestScore = ranked[0]?.score || 0;
  const ordered = LEARNING_QUERY_PATTERN.test(query)
    ? [
      ...ranked.filter((item) => LEARNING_DOCUMENT_TYPES.has(item.document.documentType)),
      ...ranked.filter((item) => !LEARNING_DOCUMENT_TYPES.has(item.document.documentType)),
    ]
    : ranked;
  const selected = [];
  const seenSections = new Set();
  for (const item of ordered) {
    const sectionKey = `${item.document.url || item.document.path}|${item.document.section}`;
    if (item.score < bestScore * 0.45 || seenSections.has(sectionKey)) continue;
    selected.push(item);
    seenSections.add(sectionKey);
    if (selected.length >= MAX_RESULTS) break;
  }
  return selected.map(({ document, score, coverage }) => ({ ...document, score, coverage }));
}

function documentationDomainBoost(relativePath, query) {
  const normalizedPath = String(relativePath || "").replaceAll("\\", "/").toLowerCase();
  let boost = 0;
  const databaseTechnology = [
    [/(?:postgres(?:ql)?|پستگرس)/iu, "/postgresql/"],
    [/(?:mysql|مای.?اس.?کیو.?ال)/iu, "/mysql/"],
    [/(?:mariadb|ماریا)/iu, "/mariadb/"],
    [/(?:mongodb|mongo|مانگو)/iu, "/mongodb/"],
    [/(?:redis|ردیس)/iu, "/redis/"],
  ].find(([pattern]) => pattern.test(query));
  if (databaseTechnology?.[1] && normalizedPath.includes(databaseTechnology[1])) boost += 8;
  if (/(?:\bnode(?:\.js)?\b|نود)/iu.test(query)) {
    if (normalizedPath.includes("/nodejs/")) boost += 5;
    else if (normalizedPath.includes("/docker/")) boost -= 1;
  }
  if (queryTokensForSearch(query).includes("nextjs")) {
    if (normalizedPath.includes("/nextjs/")) boost += 5;
    else if (normalizedPath.includes("/nodejs/")) boost -= 1;
  }
  if (!DATABASE_QUERY_PATTERN.test(query)) return boost;
  if (normalizedPath.includes("/dbaas/")) return boost + 2.5;
  if (normalizedPath.includes("/references/cli/") && normalizedPath.includes("db")) return boost + 1.75;
  if (normalizedPath.includes("/paas/") && normalizedPath.includes("connect-to-db")) return boost + 1.25;
  if (normalizedPath.includes("/iaas/") && normalizedPath.includes("deploy-db")) return boost + 0.75;
  return boost;
}

const TECHNICAL_TERM_PATTERN = /^(?:api|api-key|cli|docker|redis|postgres|postgresql|mysql|mongodb|ssh|http|https|graphql|deploy|deployment|node|node\.js|python|php|token|cors|dns|ssl|tls)$/iu;

function queryTokensForSearch(value) {
  const salient = queryTokens(value);
  return salient.length ? salient : [...new Set(tokens(value))];
}

export function documentationQueryTokens(value) {
  return queryTokensForSearch(value);
}

function expandQuery(query) {
  const normalizedQuery = normalizeText(query);
  const salientQuery = queryTokensForSearch(normalizedQuery).join(" ");
  const synonyms = QUERY_SYNONYMS.filter(([pattern]) => pattern.test(normalizedQuery)).map(([, value]) => value);
  return `${salientQuery} ${synonyms.join(" ")}`.trim();
}

export async function searchDocumentation(query) {
  if (!query?.trim()) return { available: true, hits: [] };
  try {
    const databaseHits = await searchDocumentationDatabase(query);
    if (databaseHits) return { available: true, hits: rankDocuments(databaseHits, query) };
  } catch {
    // A not-yet-migrated database should not make the chat unusable.
  }
  try {
    documentsPromise ||= loadDocuments();
    const documents = await documentsPromise;
    return { available: true, hits: rankDocuments(documents, query) };
  } catch {
    return { available: false, hits: [] };
  }
}

async function searchDocumentationDatabase(query) {
  const prisma = await getPrisma();
  if (!prisma) return null;
  const indexedDocuments = await prisma.knowledgeDocument.count({ where: { isActive: true } });
  if (!indexedDocuments) return null;
  const expandedQuery = expandQuery(query);
  const tsQuery = [...new Set(tokens(expandedQuery).map((term) => term.replace(/[^\p{L}\p{N}_]/gu, "")))].filter(Boolean).join(" | ");
  if (!tsQuery) return [];
  const rows = await prisma.$queryRaw`
    WITH matched_chunks AS (
      SELECT
        c."id",
        c."section",
        c."content" AS "body",
        c."chunkIndex",
        d."id" AS "documentId",
        d."title",
        d."sourcePath" AS "path",
        d."url",
        d."imageUrl",
        d."category",
        d."service",
        d."documentType",
        ts_rank(
          setweight(to_tsvector('simple', d."title"), 'A')
          || setweight(to_tsvector('simple', c."section"), 'A')
          || setweight(to_tsvector('simple', d."sourcePath"), 'B')
          || setweight(to_tsvector('simple', c."content"), 'C'),
          to_tsquery('simple', ${tsQuery})
        ) AS "dbScore",
        ROW_NUMBER() OVER (
          PARTITION BY d."id"
          ORDER BY ts_rank(
            setweight(to_tsvector('simple', d."title"), 'A')
            || setweight(to_tsvector('simple', c."section"), 'A')
            || setweight(to_tsvector('simple', d."sourcePath"), 'B')
            || setweight(to_tsvector('simple', c."content"), 'C'),
            to_tsquery('simple', ${tsQuery})
          ) DESC, c."chunkIndex" ASC
        ) AS "documentRank",
        ROW_NUMBER() OVER (
          PARTITION BY d."category", d."service"
          ORDER BY ts_rank(
            setweight(to_tsvector('simple', d."title"), 'A')
            || setweight(to_tsvector('simple', c."section"), 'A')
            || setweight(to_tsvector('simple', d."sourcePath"), 'B')
            || setweight(to_tsvector('simple', c."content"), 'C'),
            to_tsquery('simple', ${tsQuery})
          ) DESC, d."sourcePath" ASC, c."chunkIndex" ASC
        ) AS "serviceRank"
      FROM "KnowledgeChunk" c
      INNER JOIN "KnowledgeDocument" d ON d."id" = c."documentId"
      WHERE c."isActive" = true
        AND d."isActive" = true
        AND to_tsvector('simple', c."normalizedText") @@ to_tsquery('simple', ${tsQuery})
    )
    SELECT *
    FROM matched_chunks
    WHERE "documentRank" <= 2
      AND "serviceRank" <= ${LEARNING_QUERY_PATTERN.test(query) ? 20 : 8}
    ORDER BY "dbScore" DESC, "path" ASC
    LIMIT ${MAX_RESULTS * 20}
  `;
  return rows.map((row) => ({ ...row, dbScore: Number(row.dbScore || 0) }));
}

function getOnlineClient() {
  if (onlineClient) return onlineClient;
  const host = process.env.LIARA_DOCS_SEARCH_URL;
  if (!host) return null;
  const options = { host: host.replace(/\/$/, "") };
  if (process.env.LIARA_DOCS_SEARCH_KEY) options.apiKey = process.env.LIARA_DOCS_SEARCH_KEY;
  onlineClient = new MeiliSearch(options);
  return onlineClient;
}

function onlineHitToDocumentation(hit) {
  const title = normalizeText(hit.title || hit.name || "Documentation لیارا");
  const body = normalizeText(hit.body || hit.content || hit.description || "");
  return {
    title,
    path: hit.path || "",
    url: isValidDocumentationUrl(hit.url) ? hit.url : null,
    section: normalizeText(hit.element || hit.section || title),
    body: body.slice(0, MAX_BODY_LENGTH),
    platform: hit.platform,
    element: hit.element,
    type: hit.type,
    src: hit.src,
    ...documentationMetadata(hit.path),
  };
}

export async function searchDocumentationOnline(query) {
  if (!query?.trim()) return { available: true, hits: [] };
  const client = getOnlineClient();
  if (!client) return { available: false, hits: [] };
  try {
    const result = await client.index(ONLINE_INDEX).search(expandQuery(query), { limit: MAX_RESULTS });
    return { available: true, hits: (result.hits || []).map(onlineHitToDocumentation) };
  } catch {
    return { available: false, hits: [] };
  }
}

export function isValidDocumentationUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && DOCUMENTATION_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}

const SENSITIVE_TEXT_PATTERNS = [
  /(?:api[_ -]?key|token|secret|password|رمز(?:\s*عبور)?|کلید(?:\s+خصوصی)?|پسورد)\s*[:=]\s*(?:["'`][^"'`\r\n]{8,}["'`]|[A-Za-z0-9._~+/=-]{16,})/giu,
  /(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^\s`'"<>]+/giu,
  /\b(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]{12,}/giu,
  /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/giu,
  /\b(?:sk|pk|ghp|github_pat)_[A-Za-z0-9_-]{12,}/g,
];

export function redactSensitiveText(value) {
  return SENSITIVE_TEXT_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[اطلاعات محرمانه حذف شد]"), String(value || ""));
}

export function formatDocumentationContext(hits) {
  let totalLength = 0;
  return hits.map((hit, index) => {
    if (totalLength >= MAX_CONTEXT_LENGTH) return "";
    const body = redactSensitiveText(hit.body).slice(0, Math.max(0, MAX_CONTEXT_LENGTH - totalLength));
    const source = `<documentation-source id="${index + 1}">
عنوان سند: ${hit.title}
مسیر فایل: ${hit.path}
لینک Documentation: ${hit.url || ""}
بخش مربوطه: ${hit.section}
دسته: ${hit.category || ""}
سرویس: ${hit.service || ""}
نوع سند: ${hit.documentType || ""}
محتوا:
${body}
</documentation-source>`;
    totalLength += source.length;
    return source;
  }).filter(Boolean).join("\n\n");
}

export function toInternalDocumentationUrl(value) {
  if (!value) return "/documentation";
  try {
    const url = new URL(value, "https://docs.liara.ir");
    if (url.hostname === "docs.liara.ir") return `${url.pathname}${url.search}${url.hash}` || "/documentation";
  } catch {
    return value;
  }
  return value;
}

export function formatDocumentationSources(hits) {
  if (!hits?.length) return "";
  const unique = [...new Map(hits.filter((hit) => isValidDocumentationUrl(hit.url)).map((hit) => [hit.url, hit])).values()].slice(0, 1);
  if (!unique.length) return "";
  return `\n\n## منبع پاسخ\n\n📄 منابع مرتبط:\n\n${unique.map((hit) => {
    const title = String(hit.title || "Documentation لیارا").replace(/[\[\]]/g, "");
    return `- [${title}](${hit.url})`;
  }).join("\n")}`;
}

export function toPublicDocumentationHit(hit) {
  if (!isValidDocumentationUrl(hit?.url)) return null;
  return {
    id: hit.id,
    title: hit.title,
    path: hit.path,
    url: hit.url,
    section: hit.section,
    imageUrl: hit.imageUrl || hit.src || null,
    platform: hit.platform,
    element: hit.element,
    type: hit.type,
    category: hit.category || documentationMetadata(hit.path).category,
    service: hit.service || documentationMetadata(hit.path).service,
    documentType: hit.documentType || documentationMetadata(hit.path).documentType,
  };
}
