import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;
const configuredConnectionLimit = Number.parseInt(process.env.PRISMA_CONNECTION_LIMIT ?? "5", 10);
const connectionLimit = Number.isFinite(configuredConnectionLimit) && configuredConnectionLimit > 0
  ? configuredConnectionLimit
  : 5;

const databaseUrlForRuntime = databaseUrl?.replace(
  /(pooler\.supabase\.com):5432\b/i,
  "$1:6543"
);
const usesSupabaseTransactionPooler = /pooler\.supabase\.com:6543\b/i.test(
  databaseUrlForRuntime ?? ""
);

const databaseUrlWithConnectionLimit = databaseUrlForRuntime
  ? (() => {
      const withConnectionLimit = /([?&])connection_limit=\d+/i.test(databaseUrlForRuntime)
        ? databaseUrlForRuntime.replace(
            /([?&])connection_limit=\d+/i,
            `$1connection_limit=${connectionLimit}`
          )
        : `${databaseUrlForRuntime}${databaseUrlForRuntime.includes("?") ? "&" : "?"}connection_limit=${connectionLimit}`;

      return !usesSupabaseTransactionPooler || /([?&])pgbouncer=/i.test(withConnectionLimit)
        ? withConnectionLimit
        : `${withConnectionLimit}&pgbouncer=true`;
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
