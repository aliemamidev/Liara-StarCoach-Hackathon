import fs from "node:fs/promises";
import path from "node:path";
import MeiliSearch from "meilisearch";

const MAX_RESULTS = 1;
const MAX_BODY_LENGTH = 4200;
const CHUNK_LENGTH = 2200;
const DOCUMENTATION_ROOTS = ["public/llms"];
const ONLINE_INDEX = "docs";
const DATABASE_QUERY_PATTERN = /(?:دیتابیس|پایگاه\s+داده|database|postgres(?:ql)?|mysql|mariadb|mongodb|mongo|redis|rabbitmq|elasticsearch|elastic\s*search|mssql|sql\s*server|sqlite|بکاپ|backup|بازیابی|restore|connection\s*pool|اتصال\s+به\s+(?:دیتابیس|پایگاه))/iu;
const SEARCH_STOP_WORDS = new Set(["به", "در", "برای", "با", "از", "و", "را", "یک", "این", "آن", "برنامه", "روش", "است", "های", "کردن"]);
let documentsPromise;
let onlineClient;

function normalizeText(value) {
  return String(value || "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return (normalizeText(value).toLocaleLowerCase("fa").match(/[\p{L}\p{N}]+/gu) || [])
    .filter((token) => !SEARCH_STOP_WORDS.has(token));
}

const QUERY_SYNONYMS = [
  [/\bdeploy(?:ment)?\b|استقرار|دیپلوی/iu, "deploy deployment استقرار دیپلوی"],
  [/\bnode(?:\.js)?\b|نود/iu, "node nodejs node.js نود"],
  [/\bplan\b|پلن|قیمت/iu, "plan pricing price پلن قیمت"],
  [/database|postgres(?:ql)?|mysql|mongodb|redis|دیتابیس|پایگاه\s+داده/iu, "database دیتابیس پایگاه داده postgres postgresql mysql mongodb redis"],
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

function docsUrl(content, relativePath) {
  const originalLink = content.match(/^Original link:\s*(\S+)/mi)?.[1];
  if (originalLink) return originalLink;
  const route = relativePath.replace(/^src[\\/]pages[\\/]/, "").replace(/^public[\\/]llms[\\/]/, "").replace(/\.(md|mdx|html?)$/i, "").replace(/[\\\\]/g, "/");
  return `https://docs.liara.ir/${route.replace(/\/about$/, "")}/`;
}

function splitIntoChunks(content, fallbackTitle) {
  const lines = cleanMarkdown(content).split("\n");
  const chunks = [];
  let section = fallbackTitle;
  let buffer = [];

  const flush = () => {
    const text = normalizeText(buffer.join(" "));
    if (!text) return;
    for (let offset = 0; offset < text.length; offset += CHUNK_LENGTH) {
      const body = text.slice(offset, offset + CHUNK_LENGTH).trim();
      if (body) chunks.push({ section, body });
    }
    buffer = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,4}\s+(.+)$/)?.[1];
    if (heading) {
      flush();
      section = normalizeText(heading.replace(/[*_`]/g, "")) || fallbackTitle;
    } else {
      buffer.push(line);
    }
  }
  flush();
  return chunks.length ? chunks : [{ section: fallbackTitle, body: normalizeText(cleanMarkdown(content)) }];
}

async function loadDocuments() {
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
    const url = docsUrl(raw, relativePath);
    for (const chunk of splitIntoChunks(raw, title)) {
      const body = chunk.body.slice(0, MAX_BODY_LENGTH);
      if (!body) continue;
      const dedupeKey = `${url}|${chunk.section}|${body}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      documents.push({
        title,
        path: relativePath,
        url,
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

function scoreDocument(document, query, queryTokens) {
  const normalizedQuery = normalizeText(query).toLocaleLowerCase("fa");
  const matchingTokens = queryTokens.filter((token) => matchesToken(token, document.bodyTokens));
  const titleMatches = queryTokens.filter((token) => matchesToken(token, document.titleTokens)).length;
  const sectionMatches = queryTokens.filter((token) => matchesToken(token, document.sectionTokens)).length;
  const pathMatches = queryTokens.filter((token) => matchesToken(token, document.pathTokens)).length;
  const structuralMatches = titleMatches + sectionMatches + pathMatches;
  let score = matchingTokens.length / Math.max(queryTokens.length, 1);
  if (document.title.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 3;
  if (document.section.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 1.5;
  if (document.body.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 1.5;
  score += titleMatches * 1.8 + sectionMatches * 1.4 + pathMatches * 0.9;
  score += documentationDomainBoost(document.path, query);
  return { document, score, coverage: matchingTokens.length, structuralMatches };
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
    documentsPromise ||= loadDocuments();
    const documents = await documentsPromise;
    const queryTokens = [...new Set(tokens(normalizeText(query)))];
    const ranked = documents
      .map((document) => scoreDocument(document, query, queryTokens))
      .filter(({ coverage, structuralMatches }) => structuralMatches > 0 && coverage >= Math.max(1, Math.ceil(queryTokens.length * 0.5)))
      .sort((a, b) => b.score - a.score);
    const bestScore = ranked[0]?.score || 0;
    const selected = [];
    const seenUrls = new Set();
    for (const item of ranked) {
      if (item.score < bestScore * 0.65 || seenUrls.has(item.document.url)) continue;
      selected.push(item);
      seenUrls.add(item.document.url);
      if (selected.length >= MAX_RESULTS) break;
    }
    return {
      available: true,
      hits: selected.map(({ document, score, coverage }) => ({ ...document, score, coverage })),
    };
  } catch {
    return { available: false, hits: [] };
  }
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
    url: hit.url || "https://docs.liara.ir/",
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

export function formatDocumentationContext(hits) {
  return hits.map((hit, index) => `<documentation-source id="${index + 1}">
عنوان سند: ${hit.title}
مسیر فایل: ${hit.path}
لینک Documentation: ${hit.url}
بخش مربوطه: ${hit.section}
محتوا:
${hit.body}
</documentation-source>`).join("\n\n");
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
  const unique = [...new Map(hits.map((hit) => [hit.url || hit.path || hit.title, hit])).values()].slice(0, 1);
  return `\n\n## منبع پاسخ\n\n📄 منابع مرتبط:\n\n${unique.map((hit) => {
    const isWeb = hit.sourceType === "WEB";
    return `- ${isWeb ? `[${hit.title}](${hit.url})` : `[${hit.title}](${hit.url || "https://docs.liara.ir/"})`}`;
  }).join("\n")}`;
}
