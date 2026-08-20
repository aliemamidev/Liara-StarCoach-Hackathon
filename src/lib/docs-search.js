import MeiliSearch from "meilisearch";

const DEFAULT_SEARCH_URL = "https://search.liara.ir";
const DEFAULT_SEARCH_KEY = "53c93d9ce3308e48a7ad701d4b402d3190324a09e1607f14baae9bd4f805bb11";
const MAX_RESULTS = 5;
const MAX_BODY_LENGTH = 4500;

function getSearchClient() {
  const host = process.env.LIARA_DOCS_SEARCH_URL || DEFAULT_SEARCH_URL;
  const apiKey = process.env.LIARA_DOCS_SEARCH_KEY || DEFAULT_SEARCH_KEY;
  return new MeiliSearch({ host, apiKey });
}

function normalizeHit(hit) {
  const title = typeof hit.title === "string" ? hit.title.trim() : "Documentation لیارا";
  const url = typeof hit.url === "string" ? hit.url.trim() : "";
  const section = typeof hit.title === "string" ? hit.title.trim() : "";
  const element = typeof hit.element === "string" ? hit.element.trim() : "";
  const link = element && !url.includes(element) ? `${url}${element}` : url;
  const body = typeof hit.body === "string" ? hit.body.trim().slice(0, MAX_BODY_LENGTH) : "";

  return { title, url: link, section, body };
}

export async function searchDocumentation(query) {
  if (!query?.trim()) return { available: true, hits: [] };

  try {
    const result = await getSearchClient().index("docs").search(query.trim(), {
      limit: MAX_RESULTS,
      attributesToRetrieve: ["title", "url", "element", "body"],
    });

    return {
      available: true,
      hits: (result.hits || []).map(normalizeHit).filter((hit) => hit.body && hit.url),
    };
  } catch {
    return { available: false, hits: [] };
  }
}

export function formatDocumentationContext(hits) {
  return hits
    .map(
      (hit, index) => `<documentation-source id="${index + 1}">
عنوان سند: ${hit.title}
لینک: ${hit.url}
بخش مربوطه: ${hit.section}
محتوا:
${hit.body}
</documentation-source>`,
    )
    .join("\n\n");
}
