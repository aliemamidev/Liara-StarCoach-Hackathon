export function getAiConfig() {
  return {
    baseUrl: process.env.LIARA_AI_BASE_URL || "https://router.bynara.id/v1",
    model: process.env.LIARA_AI_MODEL || "deepseek-v4-flash",
    apiKey: process.env.LIARA_AI_API_KEY || "",
  };
}

export function isAiConfigured(config = getAiConfig()) {
  return Boolean(config.baseUrl && config.model && config.apiKey);
}
