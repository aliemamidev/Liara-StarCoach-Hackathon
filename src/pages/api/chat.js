import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  createUIMessageStream,
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  streamText,
} from "ai";
import { getAiConfig, isAiConfigured } from "@/lib/ai-config";
import { formatDocumentationContext, formatDocumentationSources } from "@/lib/docs-search";
import { createLiaControllerPlan, CLARIFICATION_MESSAGE, DOCUMENTATION_UNAVAILABLE_MESSAGE, LIA_STAGES, PROBABLE_FALLBACK_NOTICE, SCREENSHOT_MESSAGE, validateLiaDraft } from "@/lib/lia-controller";
import { LIA_PROBABLE_SYSTEM_PROMPT, LIA_SYSTEM_PROMPT } from "@/lib/lia-persona";

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

function pipeStaticMessage(response, messages, message, stage) {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute({ writer }) {
      const id = globalThis.crypto?.randomUUID?.() || `lia-${Date.now()}`;
      writer.write({ type: "start", messageMetadata: { liaStage: stage } });
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: message });
      writer.write({ type: "text-end", id });
      writer.write({ type: "finish", messageMetadata: { liaStage: stage } });
    },
  });

  return pipeUIMessageStreamToResponse({ response, stream });
}

function modelMessages(messages) {
  return messages.filter((message) => message.role !== "system");
}

async function generateDraft(provider, config, messages, plan, strict = false) {
  const system = plan.mode === LIA_STAGES.PROBABLE
    ? `${LIA_PROBABLE_SYSTEM_PROMPT}\n\n${PROBABLE_FALLBACK_NOTICE}`
    : `${LIA_SYSTEM_PROMPT}\n\nمنابع Documentation داخلی بازیابی‌شده:\n${formatDocumentationContext(plan.hits)}\n\n${strict ? "پیش از خروجی نهایی، پشتیبانی هر ادعا از منابع را دوباره بررسی کن." : ""}`;
  const result = streamText({
    model: provider.chatModel(config.model),
    system,
    messages: await convertToModelMessages(modelMessages(messages)),
  });
  return result.text;
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
    const plan = await createLiaControllerPlan(messages);
    if (plan.mode === "unavailable") return await pipeStaticMessage(res, messages, DOCUMENTATION_UNAVAILABLE_MESSAGE, plan.stage);
    if (plan.mode === LIA_STAGES.CLARIFICATION) return await pipeStaticMessage(res, messages, CLARIFICATION_MESSAGE, plan.stage);
    if (plan.mode === LIA_STAGES.SCREENSHOT) return await pipeStaticMessage(res, messages, SCREENSHOT_MESSAGE, plan.stage);

    let answer = await generateDraft(provider, config, messages, plan);
    if (!validateLiaDraft(answer)) answer = await generateDraft(provider, config, messages, plan, true);
    if (!validateLiaDraft(answer)) {
      return await pipeStaticMessage(res, messages, DOCUMENTATION_UNAVAILABLE_MESSAGE, LIA_STAGES.CLARIFICATION);
    }
    const finalText = plan.mode === LIA_STAGES.ANSWER
      ? `${answer.trim()}${formatDocumentationSources(plan.hits)}`
      : answer.trim();

    const stream = createUIMessageStream({
      originalMessages: messages,
      async execute({ writer }) {
        const id = globalThis.crypto?.randomUUID?.() || `lia-${Date.now()}`;
        writer.write({ type: "start", messageMetadata: { liaStage: plan.stage } });
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: finalText });
        writer.write({ type: "text-end", id });
        writer.write({ type: "finish", messageMetadata: { liaStage: plan.stage } });
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
