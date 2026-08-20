import fs from "node:fs/promises";
import path from "node:path";
import MeiliSearch from "meilisearch";

const MAX_RESULTS = 5;
const MAX_BODY_LENGTH = 6500;
const DOCUMENTATION_ROOTS = ["public/llms", "src/pages"];
const ONLINE_INDEX = "docs";
let documentsPromise;
let onlineClient;

function normalizeText(value) {
  return String(value || "").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/\u200c/g, " ").replace(/\s+/g, " ").trim();
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

function markdownToText(content) {
  return content.replace(/^import\s.+$/gm, "").replace(/^export\s.+$/gm, "").replace(/<[^>]+>/g, " ").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[`*_>#-]/g, " ");
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
    const body = normalizeText(markdownToText(raw));
    if (!body) continue;
    const title = titleFrom(raw, filePath);
    const url = docsUrl(raw, relativePath);
    const dedupeKey = `${url}|${body}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    documents.push({ title, path: relativePath, url, body, titleTokens: tokens(title), bodyTokens: new Set(tokens(body)) });
  }
  return documents;
}

function scoreDocument(document, query, queryTokens) {
  const normalizedQuery = normalizeText(query).toLocaleLowerCase("fa");
  const title = normalizeText(document.title).toLocaleLowerCase("fa");
  const body = document.body.toLocaleLowerCase("fa");
  const matchingTokens = queryTokens.filter((token) => document.bodyTokens.has(token));
  let score = matchingTokens.length / Math.max(queryTokens.length, 1);
  if (title.includes(normalizedQuery)) score += 3;
  if (body.includes(normalizedQuery)) score += 1.5;
  score += queryTokens.filter((token) => document.titleTokens.includes(token)).length * 0.35;
  return { document, score, coverage: matchingTokens.length };
}

export async function searchDocumentation(query) {
  if (!query?.trim()) return { available: true, hits: [] };
  try {
    documentsPromise ||= loadDocuments();
    const documents = await documentsPromise;
    const queryTokens = [...new Set(tokens(query))];
    const hits = documents.map((document) => scoreDocument(document, query, queryTokens)).filter(({ coverage, score }) => coverage > 0 || score > 0).sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS).map(({ document, score, coverage }) => ({ title: document.title, path: document.path, url: document.url, section: document.title, body: document.body.slice(0, MAX_BODY_LENGTH), score, coverage }));
    return { available: true, hits };
  } catch { return { available: false, hits: [] }; }
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
    const result = await client.index(ONLINE_INDEX).search(query, { limit: MAX_RESULTS });
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

export function formatDocumentationSources(hits) {
  return `\n\n## منبع پاسخ\n\n📄 Documentation:\n\n${hits.map((hit) => `- عنوان سند: ${hit.title}\n  - مسیر فایل: \`${hit.path}\`\n  - لینک: [مشاهده در docs.liara.ir](${hit.url})`).join("\n")}`;
}
