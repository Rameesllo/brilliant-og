import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;
const configuredConnectionLimit = Number.parseInt(process.env.PRISMA_CONNECTION_LIMIT ?? "5", 10);
const connectionLimit = Number.isFinite(configuredConnectionLimit) && configuredConnectionLimit > 0
  ? configuredConnectionLimit
  : 5;

const databaseUrlWithConnectionLimit = databaseUrl
  ? (() => {
      const withConnectionLimit = /([?&])connection_limit=\d+/i.test(databaseUrl)
        ? databaseUrl.replace(
            /([?&])connection_limit=\d+/i,
            `$1connection_limit=${connectionLimit}`
          )
        : `${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}connection_limit=${connectionLimit}`;

      return withConnectionLimit;
    })()
  : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrlWithConnectionLimit
      ? { datasources: { db: { url: databaseUrlWithConnectionLimit } } }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;
