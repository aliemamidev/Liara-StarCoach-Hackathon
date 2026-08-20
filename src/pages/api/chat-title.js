import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, generateText } from "ai";
import { getAiConfig, isAiConfigured } from "@/lib/ai-config";

function validMessages(messages) {
  return Array.isArray(messages) && messages.length > 0 && messages.length <= 50 && messages.every(
    (message) => message && ["user", "assistant"].includes(message.role) && Array.isArray(message.parts),
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const config = getAiConfig();
  if (!isAiConfigured(config) || !validMessages(req.body?.messages)) {
    return res.status(400).json({ error: "درخواست نامعتبر است." });
  }

  try {
    const provider = createOpenAICompatible({
      name: "liara-router",
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    const { text } = await generateText({
      model: provider.chatModel(config.model),
      system: "برای این گفت‌وگوی فارسی یک عنوان کوتاه و دقیق بنویس. فقط خود عنوان را، بدون نقل‌قول، شماره‌گذاری یا توضیح، در حداکثر ۶۰ کاراکتر برگردان.",
      messages: await convertToModelMessages(req.body.messages),
      maxOutputTokens: 20,
    });
    const title = text.replace(/[\"'«»]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
    return res.status(200).json({ title: title || "گفتگوی جدید" });
  } catch {
    return res.status(502).json({ error: "ساخت عنوان گفتگو ممکن نشد." });
  }
}
