export function getAiConfig() {
  return {
    baseUrl: process.env.LIARA_AI_BASE_URL || "https://api.gapgpt.app/v1",
    model: process.env.LIARA_AI_MODEL || "gpt-5.6-luna",
    apiKey: process.env.LIARA_AI_API_KEY || "",
  };
}

export function isAiConfigured(config = getAiConfig()) {
  return Boolean(config.baseUrl && config.model && config.apiKey);
}
