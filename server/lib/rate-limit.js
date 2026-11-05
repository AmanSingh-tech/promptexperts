import { prisma } from './prisma.js';

// Fixed-window counter stored in Postgres, so every API instance sees the same counts.
export function createLimiter({ name, limit, windowMs }) {
  const id = (key) => `${name}:${key}`;
  return {
    async blocked(key) {
      const h = await prisma.rateLimit.findUnique({ where: { key: id(key) } });
      return !!h && h.resetAt >= new Date() && h.count >= limit;
    },
    async hit(key) {
      const now = new Date();
      const reset = new Date(now.getTime() + windowMs);
      await prisma.$executeRaw`
        INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${id(key)}, 1, ${reset})
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
          "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${reset} ELSE "RateLimit"."resetAt" END`;
      if (Math.random() < 0.01) await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
    },
    async clear(key) {
      await prisma.rateLimit.deleteMany({ where: { key: id(key) } });
    }
  };
}
