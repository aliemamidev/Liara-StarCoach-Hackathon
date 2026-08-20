import { randomBytes } from "node:crypto";
import { getSession, hashOpaqueValue } from "@/lib/auth";

const COOKIE = "liara_chat_owner";

export async function getChatOwner(req, res) {
  const adminSession = await getSession(req).catch(() => null);
  if (adminSession) return { userId: adminSession.user.id, ownerTokenHash: null, isAdmin: true };

  let token = req.cookies?.[COOKIE];
  if (!token) {
    token = randomBytes(24).toString("base64url");
    res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; SameSite=Lax`);
  }
  return { userId: null, ownerTokenHash: hashOpaqueValue(token), isAdmin: false };
}
