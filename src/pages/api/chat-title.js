import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, generateText } from "ai";
import { getAiConfig, isAiConfigured } from "@/lib/ai-config";

function validMessages(messages) {
  return Array.isArray(messages) && messages.length > 0 && messages.length <= 50 && messages.every(
    (message) => message && ["user", "assistant"].includes(message.role) && Array.isArray(message.parts),
  );
}

function cleanTitle(value) {
  return value
    .replace(/^(عنوان|title)\s*[:：-]\s*/i, "")
    .replace(/["'«»]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!؟]+$/g, "")
    .trim()
    .slice(0, 60);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const config = getAiConfig();
  if (!isAiConfigured(config) || !validMessages(req.body?.messages) || !req.body.messages.some((message) => message.role === "user")) {
    return res.status(400).json({ error: "درخواست نامعتبر است." });
  }

  try {
    const provider = createOpenAICompatible({
      name: "liara-router",
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    const firstUserMessage = req.body.messages.find((message) => message.role === "user");
    const { text } = await generateText({
      model: provider.chatModel(config.model),
      system: "بر اساس پیام کاربر یک عنوان کوتاه و دقیق برای موضوع اصلی گفتگو بنویس. فقط خود عنوان را، بدون نقل‌قول، شماره‌گذاری، توضیح یا جمله کامل، در حداکثر ۶۰ کاراکتر و ترجیحاً حداکثر ۶ کلمه برگردان.",
      messages: await convertToModelMessages([firstUserMessage]),
      maxOutputTokens: 20,
    });
    const title = cleanTitle(text);
    return res.status(200).json({ title: title || "گفتگوی جدید" });
  } catch {
    return res.status(502).json({ error: "ساخت عنوان گفتگو ممکن نشد." });
  }
}
