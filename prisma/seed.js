import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

  await prisma.user.upsert({
    where: { email },
    update: { name: "مدیر لیارا", passwordHash: await hashPassword(password), role: "ADMIN", isActive: true },
    create: { email, name: "مدیر لیارا", passwordHash: await hashPassword(password), role: "ADMIN" },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
