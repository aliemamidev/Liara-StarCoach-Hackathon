import { deleteSession } from "@/lib/auth";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "روش درخواست پشتیبانی نمی‌شود." });
  }

  try {
    await deleteSession(req, res);
  } catch (error) {
    console.error("Admin logout failed", error);
  }
  return res.status(200).json({ ok: true });
}
