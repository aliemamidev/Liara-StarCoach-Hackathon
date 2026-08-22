const DEFAULT_ALLOWED_DOMAINS = ["docs.liara.ir", "liara.ir"];

function allowedDomains() {
  const configured = (process.env.WEB_SEARCH_ALLOWED_DOMAINS || DEFAULT_ALLOWED_DOMAINS.join(","))
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  return configured.filter((domain) => DEFAULT_ALLOWED_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`)));
}

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedDomains().some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function isWebSearchConfigured() {
  return (process.env.WEB_SEARCH_PROVIDER || "tavily").toLowerCase() === "tavily" && Boolean(process.env.WEB_SEARCH_KEY);
}

export async function searchWeb(query) {
  if (!query?.trim() || !isWebSearchConfigured()) return { available: false, hits: [] };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.WEB_SEARCH_TIMEOUT_MS || 6000));
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.WEB_SEARCH_KEY,
        query: query.slice(0, 500),
        search_depth: "basic",
        max_results: Number(process.env.WEB_SEARCH_MAX_RESULTS || 5),
        include_answer: false,
        include_raw_content: false,
        include_domains: allowedDomains(),
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { available: false, hits: [] };
    const result = await response.json();
    const hits = (result.results || []).filter((hit) => isAllowedUrl(hit.url)).map((hit) => ({
      title: String(hit.title || "منبع وب").slice(0, 240),
      path: "",
      url: hit.url,
      section: "",
      body: String(hit.content || "").replace(/\s+/g, " ").slice(0, 6500),
      sourceType: "WEB",
    }));
    return { available: true, hits };
  } catch {
    return { available: false, hits: [] };
  } finally {
    clearTimeout(timeout);
  }
}
