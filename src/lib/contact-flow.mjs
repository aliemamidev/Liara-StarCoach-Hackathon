export const CONTACT_STAGE = "awaiting_contact";

export function contactFlowStart(messages) {
  const lastContactIndex = [...messages].map((message, index) => ({ message, index })).reverse()
    .find(({ message }) => message.role === "assistant" && message.metadata?.liaStage === CONTACT_STAGE)?.index;
  if (lastContactIndex === undefined) return undefined;
  let start = lastContactIndex;
  while (start >= 2 && messages[start - 1]?.role === "user" && messages[start - 2]?.role === "assistant" && messages[start - 2]?.metadata?.liaStage === CONTACT_STAGE) {
    start -= 2;
  }
  return start;
}

export function originalMessagesForContactFlow(messages) {
  const start = contactFlowStart(messages);
  return start === undefined ? messages.slice(0, -1) : messages.slice(0, start);
}
