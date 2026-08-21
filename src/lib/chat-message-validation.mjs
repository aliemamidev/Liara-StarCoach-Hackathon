export const CHAT_ROLES = Object.freeze(["user", "assistant", "system"]);
export const MAX_CHAT_MESSAGES = 50;
export const MAX_CHAT_TEXT_LENGTH = 20000;
export const MAX_CHAT_FILES = 4;
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_DATA_URL_LENGTH = Math.ceil(MAX_FILE_BYTES / 3) * 4 + 128;

export function isAllowedMediaType(value) {
  const mediaType = String(value || "");
  return mediaType.startsWith("image/") || mediaType.startsWith("text/") || mediaType === "application/json";
}

export function dataUrlByteLength(value) {
  const match = String(value || "").match(/^data:([^;,]+)?;base64,([A-Za-z0-9+/]*={0,2})$/);
  if (!match) return null;
  const base64 = match[2];
  if (base64.length % 4 === 1) return null;
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
}

export function validateFileUIPart(part) {
  if (!part || typeof part !== "object" || part.type !== "file") return false;
  if (!isAllowedMediaType(part.mediaType)) return false;
  if (part.filename !== undefined && (typeof part.filename !== "string" || part.filename.length > 180)) return false;
  if (typeof part.url !== "string" || !part.url) return false;
  if (part.url.startsWith("data:")) {
    if (part.url.length > MAX_DATA_URL_LENGTH) return false;
    const bytes = dataUrlByteLength(part.url);
    return bytes !== null && bytes <= MAX_FILE_BYTES;
  }
  try {
    const url = new URL(part.url);
    return url.protocol === "https:" && part.url.length <= 4096;
  } catch {
    return false;
  }
}

export function validateChatMessages(messages) {
  return Array.isArray(messages)
    && messages.length > 0
    && messages.length <= MAX_CHAT_MESSAGES
    && messages.every((message) => (
      message
      && CHAT_ROLES.includes(message.role)
      && Array.isArray(message.parts)
      && message.parts.length > 0
      && message.parts.length <= MAX_CHAT_FILES + 1
      && message.parts.every((part) => {
        if (part?.type === "text") return typeof part.text === "string" && part.text.length <= MAX_CHAT_TEXT_LENGTH;
        return validateFileUIPart(part);
      })
      && message.parts.filter((part) => part?.type === "file").length <= MAX_CHAT_FILES
    ));
}

export function validateSelectedFile(file) {
  return file
    && typeof file.name === "string"
    && isAllowedMediaType(file.type)
    && Number.isFinite(file.size)
    && file.size <= MAX_FILE_BYTES;
}
