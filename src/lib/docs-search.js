import fs from "node:fs/promises";
import path from "node:path";
import MeiliSearch from "meilisearch";

const MAX_RESULTS = 8;
const MAX_BODY_LENGTH = 4200;
const CHUNK_LENGTH = 2200;
const DOCUMENTATION_ROOTS = ["public/llms", "src/pages"];
const ONLINE_INDEX = "docs";
const DATABASE_QUERY_PATTERN = /(?:دیتابیس|پایگاه\s+داده|database|postgres(?:ql)?|mysql|mariadb|mongodb|mongo|redis|rabbitmq|elasticsearch|elastic\s*search|mssql|sql\s*server|sqlite|بکاپ|backup|بازیابی|restore|connection\s*pool|اتصال\s+به\s+(?:دیتابیس|پایگاه))/iu;
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
  return normalizeText(value).toLocaleLowerCase("fa").match(/[\p{L}\p{N}]+/gu) || [];
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
      });
    }
  }
  return documents;
}

function scoreDocument(document, query, queryTokens) {
  const normalizedQuery = normalizeText(query).toLocaleLowerCase("fa");
  const matchingTokens = queryTokens.filter((token) => document.bodyTokens.has(token));
  const titleMatches = queryTokens.filter((token) => document.titleTokens.includes(token)).length;
  const sectionMatches = queryTokens.filter((token) => document.sectionTokens.includes(token)).length;
  let score = matchingTokens.length / Math.max(queryTokens.length, 1);
  if (document.title.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 3;
  if (document.section.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 1.5;
  if (document.body.toLocaleLowerCase("fa").includes(normalizedQuery)) score += 1.5;
  score += titleMatches * 0.45 + sectionMatches * 0.3;
  score += documentationDomainBoost(document.path, query);
  return { document, score, coverage: matchingTokens.length };
}

function documentationDomainBoost(relativePath, query) {
  if (!DATABASE_QUERY_PATTERN.test(query)) return 0;
  const normalizedPath = String(relativePath || "").replaceAll("\\", "/").toLowerCase();
  if (normalizedPath.includes("/dbaas/")) return 2.5;
  if (normalizedPath.includes("/references/cli/") && normalizedPath.includes("db")) return 1.75;
  if (normalizedPath.includes("/paas/") && normalizedPath.includes("connect-to-db")) return 1.25;
  if (normalizedPath.includes("/iaas/") && normalizedPath.includes("deploy-db")) return 0.75;
  return 0;
}

function expandQuery(query) {
  const normalizedQuery = normalizeText(query);
  if (!DATABASE_QUERY_PATTERN.test(normalizedQuery)) return normalizedQuery;
  return `${normalizedQuery} دیتابیس پایگاه داده dbaas database`;
}

export async function searchDocumentation(query) {
  if (!query?.trim()) return { available: true, hits: [] };
  try {
    documentsPromise ||= loadDocuments();
    const documents = await documentsPromise;
    const expandedQuery = expandQuery(query);
    const queryTokens = [...new Set(tokens(expandedQuery))];
    const ranked = documents
      .map((document) => scoreDocument(document, query, queryTokens))
      .filter(({ coverage, score }) => coverage > 0 || score > 0)
      .sort((a, b) => b.score - a.score);
    const selected = [];
    const perPath = new Map();
    for (const item of ranked) {
      const count = perPath.get(item.document.path) || 0;
      if (count >= 2) continue;
      selected.push(item);
      perPath.set(item.document.path, count + 1);
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
  const unique = [...new Map(hits.map((hit) => [hit.url || hit.path || hit.title, hit])).values()];
  return `\n\n## منبع پاسخ\n\n📄 منابع مرتبط:\n\n${unique.map((hit) => {
    const isWeb = hit.sourceType === "WEB";
    return `- عنوان منبع: ${hit.title}\n  - ${isWeb ? `[مشاهدهٔ منبع](${hit.url})` : `مسیر فایل: \`${hit.path}\`\n  - [مشاهده در Documentation لیارا](${toInternalDocumentationUrl(hit.url)})`}`;
  }).join("\n")}`;
}
