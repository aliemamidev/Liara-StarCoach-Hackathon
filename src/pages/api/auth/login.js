import { prisma } from "@/lib/prisma";
import {
  createAdminSession,
  getPublicUser,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!isValidEmail(email) || password.length < 8) {
    return res.status(422).json({ message: "ایمیل و رمز عبور معتبر وارد کنید." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user && user.isActive && user.role === "ADMIN" && await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "ایمیل یا رمز عبور نادرست است." });

    await createAdminSession(res, user.id);
    return res.status(200).json({ ok: true, user: getPublicUser(user) });
  } catch (error) {
    console.error("Admin login failed", error);
    return res.status(500).json({ message: "در ورود مشکلی پیش آمد. دوباره تلاش کنید." });
  }
}
