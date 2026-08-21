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

function tokens(value) {
  return (normalizeText(value).toLocaleLowerCase("fa").match(/[\p{L}\p{N}]+(?:[._-][\p{L}\p{N}]+)*/gu) || [])
    .filter((token) => !SEARCH_STOP_WORDS.has(token));
}

const QUERY_SYNONYMS = [
  [/\bdeploy(?:ment)?\b|استقرار|دیپلوی/iu, "deploy deployment استقرار دیپلوی"],
  [/\bnode(?:\.js)?\b|نود/iu, "node nodejs node.js نود"],
  [/\bplan\b|پلن|قیمت/iu, "plan pricing price پلن قیمت"],
  [/database|postgres(?:ql)?|mysql|mongodb|redis|دیتابیس|پایگاه\s+داده/iu, "database دیتابیس پایگاه داده postgres postgresql mysql mongodb redis"],
  [/error|خطا|ارور|exception|مشکل/iu, "error خطا ارور exception مشکل"],
  [/env|environment|محیط|متغیر\s+محیطی/iu, "env environment محیط متغیر محیطی"],
];

function tokenVariants(token) {
  const match = QUERY_SYNONYMS.find(([pattern, value]) => pattern.test(token));
  return match ? tokens(match[1]) : [token];
}

function matchesToken(token, values) {
  const valueSet = values instanceof Set ? values : new Set(values);
  return tokenVariants(token).some((variant) => valueSet.has(variant));
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
  };
}

function scoreDocument(document, query, queryTokens) {
  const normalizedQuery = normalizeText(query).toLocaleLowerCase("fa");
  const matchingTokens = queryTokens.filter((token) => matchesToken(token, document.bodyTokens));
  const titleMatches = queryTokens.filter((token) => matchesToken(token, document.titleTokens)).length;
  const sectionMatches = queryTokens.filter((token) => matchesToken(token, document.sectionTokens)).length;
  const pathMatches = queryTokens.filter((token) => matchesToken(token, document.pathTokens)).length;
  const structuralMatches = titleMatches + sectionMatches + pathMatches;
  let score = (matchingTokens.length / Math.max(queryTokens.length, 1)) * 2;
  if (normalizedQuery.length > 3 && document.title.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 4;
  if (normalizedQuery.length > 3 && document.section.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 2.5;
  if (normalizedQuery.length > 5 && document.body.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 2;
  score += titleMatches * 2.2 + sectionMatches * 1.6 + pathMatches;
  score += documentationDomainBoost(document.path, query);
  score += Number(document.dbScore || 0);
  return { document, score, coverage: matchingTokens.length, structuralMatches };
}

function rankDocuments(documents, query) {
  const queryTokens = [...new Set(tokens(normalizeText(query)))];
  const minimumCoverage = queryTokens.length <= 2
    ? 1
    : queryTokens.length <= 5
      ? Math.ceil(queryTokens.length * 0.5)
      : Math.max(2, Math.ceil(queryTokens.length * 0.35));
  const ranked = documents
    .map((document) => scoreDocument(searchableDocument(document), query, queryTokens))
    .filter(({ coverage, structuralMatches }) => coverage >= minimumCoverage && (structuralMatches > 0 || coverage >= 2))
    .sort((a, b) => b.score - a.score);
  const bestScore = ranked[0]?.score || 0;
  const selected = [];
  const seenSections = new Set();
  for (const item of ranked) {
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
  if (!DATABASE_QUERY_PATTERN.test(query)) return boost;
  if (normalizedPath.includes("/dbaas/")) return boost + 2.5;
  if (normalizedPath.includes("/references/cli/") && normalizedPath.includes("db")) return boost + 1.75;
  if (normalizedPath.includes("/paas/") && normalizedPath.includes("connect-to-db")) return boost + 1.25;
  if (normalizedPath.includes("/iaas/") && normalizedPath.includes("deploy-db")) return boost + 0.75;
  return boost;
}

function expandQuery(query) {
  const normalizedQuery = normalizeText(query);
  const synonyms = QUERY_SYNONYMS.filter(([pattern]) => pattern.test(normalizedQuery)).map(([, value]) => value);
  return `${normalizedQuery} ${synonyms.join(" ")}`.trim();
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
    SELECT
      c."id",
      c."section",
      c."content" AS "body",
      d."title",
      d."sourcePath" AS "path",
      d."url",
      d."imageUrl",
      ts_rank(
        to_tsvector('simple', c."normalizedText"),
        to_tsquery('simple', ${tsQuery})
      ) AS "dbScore"
    FROM "KnowledgeChunk" c
    INNER JOIN "KnowledgeDocument" d ON d."id" = c."documentId"
    WHERE c."isActive" = true
      AND d."isActive" = true
      AND to_tsvector('simple', c."normalizedText") @@ to_tsquery('simple', ${tsQuery})
    ORDER BY "dbScore" DESC
    LIMIT ${MAX_RESULTS * 12}
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
  /(?:api[_ -]?key|token|secret|password|رمز(?:\s*عبور)?|کلید(?:\s+خصوصی)?|پسورد)\s*[:=]\s*[^\s`,'")]+/giu,
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
  };
}
