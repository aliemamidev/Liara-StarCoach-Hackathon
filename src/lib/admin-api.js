import { getSession } from "@/lib/auth";

export async function requireAdmin(req, res) {
  const session = await getSession(req).catch(() => null);
  if (!session) {
    res.status(401).json({ message: "ورود مدیر لازم است." });
    return null;
  }
  return session;
}
