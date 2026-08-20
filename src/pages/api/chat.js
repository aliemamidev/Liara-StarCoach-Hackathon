import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  createUIMessageStream,
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  streamText,
} from "ai";
import { getAiConfig, isAiConfigured } from "@/lib/ai-config";
import { formatDocumentationContext, formatDocumentationSources, searchDocumentation } from "@/lib/docs-search";
import { LIA_SYSTEM_PROMPT } from "@/lib/lia-persona";

const NO_DOCUMENTATION_MESSAGE = `## پاسخ

در Documentation فعلی لیارا اطلاعات کافی برای پاسخ دقیق به این پرسش پیدا نکردم. لطفاً نام محصول یا سرویس، پلتفرم، نسخه، متن خطا یا Screenshot مربوط به مشکل را ارسال کنید تا بتوانم دقیق‌تر بررسی کنم.

## منبع پاسخ

📄 Documentation:

- منبع مرتبطی در Documentation فعلی پیدا نشد.`;

const DOCUMENTATION_UNAVAILABLE_MESSAGE = `## پاسخ

در حال حاضر خواندن Documentation داخلی در دسترس نیست؛ بنابراین برای جلوگیری از ارائهٔ اطلاعات نادرست، پاسخ قطعی نمی‌دهم. لطفاً کمی بعد دوباره تلاش کنید.

## منبع پاسخ

📄 Documentation داخلی:

- خواندن فایل‌های Documentation پروژه ممکن نشد.`;

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

function latestUserText(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return (latestUserMessage?.parts || [])
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

function pipeStaticMessage(response, message) {
  const stream = createUIMessageStream({
    execute({ writer }) {
      const id = globalThis.crypto?.randomUUID?.() || `lia-${Date.now()}`;
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: message });
      writer.write({ type: "text-end", id });
    },
  });

  return pipeUIMessageStreamToResponse({ response, stream });
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
    const documentation = await searchDocumentation(latestUserText(messages));
    if (!documentation.available) {
      return await pipeStaticMessage(res, DOCUMENTATION_UNAVAILABLE_MESSAGE);
    }
    if (!documentation.hits.length) {
      return await pipeStaticMessage(res, NO_DOCUMENTATION_MESSAGE);
    }

    const provider = createOpenAICompatible({
      name: "liara-router",
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      includeUsage: true,
    });
    const result = streamText({
      model: provider.chatModel(config.model),
      system: `${LIA_SYSTEM_PROMPT}\n\nمنابع Documentation داخلی بازیابی‌شده:\n${formatDocumentationContext(documentation.hits)}\n\nمنبع پاسخ را خودت تولید نکن؛ سرور پس از متن پاسخ آن را دقیقاً اضافه می‌کند.`,
      messages: await convertToModelMessages(messages.filter((message) => message.role !== "system")),
    });

    const stream = createUIMessageStream({
      async execute({ writer }) {
        const id = globalThis.crypto?.randomUUID?.() || `lia-${Date.now()}`;
        writer.write({ type: "text-start", id });
        for await (const chunk of result.textStream) writer.write({ type: "text-delta", id, delta: chunk });
        writer.write({ type: "text-delta", id, delta: formatDocumentationSources(documentation.hits) });
        writer.write({ type: "text-end", id });
      },
    });
    await pipeUIMessageStreamToResponse({
      response: res,
      stream,
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(502).json({ error: "دریافت پاسخ از ایجنت ممکن نشد." });
    }
    res.end();
  }
}
