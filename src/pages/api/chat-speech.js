import { getAiConfig, isAiConfigured } from "@/lib/ai-config";

const MAX_INPUT_LENGTH = 4000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const config = getAiConfig();
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!isAiConfigured(config) || !text) {
    return res.status(400).json({ error: "متن صوتی معتبر نیست." });
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return res.status(413).json({ error: "متن برای تبدیل صوتی بیش از حد طولانی است." });
  }

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.ttsModel,
        input: text,
        voice: config.ttsVoice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      return res.status(502).json({
        error: "تبدیل پاسخ به صدا از سرویس ممکن نشد.",
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", response.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Content-Length", audio.length);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audio);
  } catch {
    return res.status(502).json({ error: "اتصال به سرویس تبدیل متن به صدا ممکن نشد." });
  }
}
