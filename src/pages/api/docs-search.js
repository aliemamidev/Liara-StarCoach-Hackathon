import { searchDocumentation, searchDocumentationOnline, toPublicDocumentationHit } from "@/lib/docs-search";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const query = String(req.query?.q || "").trim().slice(0, 200);
  if (!query) return res.status(200).json({ hits: [] });

  const local = await searchDocumentation(query);
  const online = !local.available || !local.hits.length
    ? await searchDocumentationOnline(query)
    : { available: false, hits: [] };
  if (!local.available && !online.available) return res.status(503).json({ error: "جست‌وجوی Documentation در دسترس نیست." });
  const hits = [...new Map([...local.hits, ...online.hits]
    .map(toPublicDocumentationHit)
    .filter(Boolean)
    .map((hit) => [hit.url, hit])).values()].slice(0, 10);
  return res.status(200).json({ hits });
}
