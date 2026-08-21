import { searchDocumentation, searchDocumentationOnline } from "@/lib/docs-search";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const query = String(req.query?.q || "").trim().slice(0, 200);
  if (!query) return res.status(200).json({ hits: [] });

  let result = await searchDocumentation(query);
  if (!result.available || !result.hits.length) result = await searchDocumentationOnline(query);
  if (!result.available) return res.status(503).json({ error: "جست‌وجوی Documentation در دسترس نیست." });
  return res.status(200).json({ hits: result.hits.slice(0, 10) });
}
