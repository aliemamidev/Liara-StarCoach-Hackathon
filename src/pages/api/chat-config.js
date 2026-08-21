import { getAiConfig, isAiConfigured } from "@/lib/ai-config";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const config = getAiConfig();
  return res.status(200).json({ configured: isAiConfigured(config) });
}
