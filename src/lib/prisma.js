import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
}

export const prisma =
  globalForPrisma.__liaraPrisma ||
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
    }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__liaraPrisma = prisma;
