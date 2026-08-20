import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { getAiConfig, isAiConfigured } from "@/lib/ai-config";

function validMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 50 &&
    messages.every(
      (message) =>
        message &&
        ["user", "assistant", "system"].includes(message.role) &&
        Array.isArray(message.parts) &&
        message.parts.every(
          (part) => part?.type !== "text" || typeof part.text === "string",
        ),
    )
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const config = getAiConfig();
  if (!isAiConfigured(config)) {
    return res.status(503).json({ error: "اتصال ایجنت در سرور پیکربندی نشده است." });
  }

  const messages = req.body?.messages;
  if (!validMessages(messages)) {
    return res.status(400).json({ error: "پیام‌های ارسالی معتبر نیستند." });
  }

  try {
    const provider = createOpenAICompatible({
      name: "liara-router",
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      includeUsage: true,
    });
    const result = streamText({
      model: provider.chatModel(config.model),
      messages: await convertToModelMessages(messages),
    });

    await pipeUIMessageStreamToResponse({
      response: res,
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(502).json({ error: "دریافت پاسخ از ایجنت ممکن نشد." });
    }
    res.end();
  }
}
