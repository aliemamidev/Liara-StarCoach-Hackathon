import {
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth-core.mjs";
const SESSION_COOKIE = "liara_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return secret;
}

function hashSessionToken(token) {
  return createHmac("sha256", getSessionSecret()).update(token).digest("hex");
}

function setCookie(res, token, maxAge) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    ...(maxAge === 0 ? ["Expires=Thu, 01 Jan 1970 00:00:00 GMT"] : []),
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res) {
  setCookie(res, "", 0);
}

export async function createAdminSession(res, userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId, expiresAt } });
  setCookie(res, token, SESSION_TTL_MS / 1000);
}

export async function getSession(req) {
  const rawToken = req.cookies?.[SESSION_COOKIE];
  if (!rawToken) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(rawToken) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.isActive || session.user.role !== "ADMIN") {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { sessionId: session.id, user: session.user };
}

export async function deleteSession(req, res) {
  const rawToken = req.cookies?.[SESSION_COOKIE];
  if (rawToken) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(rawToken) } });
  }
  clearSessionCookie(res);
}

export function getPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone || null,
    name: user.name,
    role: user.role,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

export function hashOpaqueValue(value) {
  return createHash("sha256").update(value).digest("hex");
}

export { hashPassword, isValidEmail, normalizeEmail, verifyPassword };
