import { requireAdmin } from "@/lib/admin-api";
import { getAdminSettings, serializeAdminSettings } from "@/lib/admin-settings";
import { prisma } from "@/lib/prisma";

const SETTINGS_KEYS = ["captureUnknownTopics", "notifyFailures", "webSearchEnabled", "probableAnswersEnabled", "autoEscalationEnabled"];

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method === "GET") {
    const settings = await getAdminSettings();
    return res.status(200).json({ settings: serializeAdminSettings(settings) });
  }
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  }

  const changes = {};
  for (const key of SETTINGS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
      if (typeof req.body[key] !== "boolean") return res.status(422).json({ field: key, message: "مقدار تنظیمات باید روشن یا خاموش باشد." });
      changes[key] = req.body[key];
    }
  }
  if (!Object.keys(changes).length) return res.status(422).json({ message: "تنظیمی برای ذخیره ارسال نشده است." });

  const current = await getAdminSettings();
  const settings = await prisma.adminSettings.update({ where: { id: current.id }, data: changes });
  return res.status(200).json({ settings: serializeAdminSettings(settings) });
}
