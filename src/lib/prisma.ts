import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;
const databaseUrlWithConnectionLimit = databaseUrl && databaseUrl.includes("connection_limit=")
  ? databaseUrl
  : databaseUrl
    ? `${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}connection_limit=5`
    : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrlWithConnectionLimit
      ? { datasources: { db: { url: databaseUrlWithConnectionLimit } } }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
