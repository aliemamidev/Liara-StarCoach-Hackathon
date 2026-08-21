import { getPublicUser, normalizeEmail } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

function normalizeDigits(value) {
  return String(value || "").replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function normalizePhone(value) {
  const raw = normalizeDigits(value).replace(/[\s()-]/g, "");
  if (!raw) return null;
  if (/^09\d{9}$/.test(raw)) return `+98${raw.slice(1)}`;
  if (/^989\d{9}$/.test(raw)) return `+${raw}`;
  if (/^\+989\d{9}$/.test(raw)) return raw;
  return undefined;
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === "GET") {
    return res.status(200).json({ user: getPublicUser(session.user) });
  }
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const email = normalizeEmail(req.body?.email);
  const phone = normalizePhone(req.body?.phone);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(422).json({ field: "email", message: "ایمیل معتبر وارد کنید." });
  if (phone === undefined) return res.status(422).json({ field: "phone", message: "شماره موبایل را به‌صورت معتبر وارد کنید." });

  try {
    const duplicate = await prisma.user.findFirst({ where: { OR: [{ email }, ...(phone ? [{ phone }] : [])], NOT: { id: session.user.id } }, select: { email: true, phone: true } });
    if (duplicate?.email === email) return res.status(409).json({ field: "email", message: "این ایمیل قبلاً استفاده شده است." });
    if (phone && duplicate?.phone === phone) return res.status(409).json({ field: "phone", message: "این شماره موبایل قبلاً استفاده شده است." });
    const user = await prisma.user.update({ where: { id: session.user.id }, data: { email, phone } });
    return res.status(200).json({ user: getPublicUser(user) });
  } catch (error) {
    console.error("Admin profile update failed", error);
    return res.status(500).json({ message: "ذخیره پروفایل انجام نشد." });
  }
}
