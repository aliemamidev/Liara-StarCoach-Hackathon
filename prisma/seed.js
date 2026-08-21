import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { hashPassword, isValidEmail, normalizeEmail } from "../src/lib/auth-core.mjs";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for seeding");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD;
  if (!isValidEmail(email) || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required for seeding");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");

  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name: "مدیر لیارا", passwordHash, role: "ADMIN", isActive: true },
    create: { email, name: "مدیر لیارا", passwordHash, role: "ADMIN" },
  });

  const demoChats = [
    { id: "seed-chat-deploy", owner: "seed-owner-1", title: "استقرار اپلیکیشن Node.js", question: "چطور اپلیکیشن Node.js را دیپلوی کنم؟", answer: "ابتدا پروژه را به گیت متصل کنید و فرآیند CI/CD را روی شاخه اصلی تنظیم کنید." },
    { id: "seed-chat-database", owner: "seed-owner-2", title: "اتصال PostgreSQL", question: "چطور به PostgreSQL وصل شوم؟", answer: "رشته اتصال را در متغیر محیطی قرار دهید و اتصال را با Prisma مدیریت کنید." },
    { id: "seed-chat-dns", owner: "seed-owner-3", title: "خطای 502 و DNS", question: "خطای 502 بعد از تغییر DNS را چطور رفع کنم؟", answer: "انتشار DNS، پراکسی و سلامت سرویس مقصد را بررسی کنید." },
  ];
  for (const demo of demoChats) {
    const ownerTokenHash = createHash("sha256").update(demo.owner).digest("hex");
    const createdAt = new Date(Date.now() - (demoChats.length - demoChats.indexOf(demo)) * 60 * 60 * 1000);
    await prisma.chat.upsert({
      where: { id: demo.id },
      update: { title: demo.title, ownerTokenHash, userId: null, updatedAt: createdAt },
      create: { id: demo.id, title: demo.title, ownerTokenHash, createdAt, updatedAt: createdAt },
    });
    await prisma.message.deleteMany({ where: { chatId: demo.id } });
    await prisma.message.createMany({ data: [
      { id: `${demo.id}-user`, chatId: demo.id, role: "user", parts: [{ type: "text", text: demo.question }], createdAt },
      { id: `${demo.id}-assistant`, chatId: demo.id, role: "assistant", parts: [{ type: "text", text: demo.answer }], createdAt: new Date(createdAt.getTime() + 30 * 1000) },
    ] });
  }
  console.log(`Seeded admin ${admin.email} and ${demoChats.length} demo chats.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
