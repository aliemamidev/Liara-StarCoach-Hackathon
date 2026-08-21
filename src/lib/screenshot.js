import { MAX_FILE_BYTES } from "@/lib/chat-message-validation.mjs";

export async function canvasToJpegFile(sourceCanvas, filename) {
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
  canvas.getContext("2d").drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob || blob.size > MAX_FILE_BYTES) throw new Error("screenshot-too-large");
  return new File([blob], filename, { type: "image/jpeg" });
}
