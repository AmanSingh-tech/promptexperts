import { prisma } from './prisma.js';
import { HttpError } from './http.js';

const LEASE_MS = 45000;
const RENEW_MS = 15000;
const LOCK_ID = 7204101; // serialises slot checks across API instances

const expiry = () => new Date(Date.now() + LEASE_MS);

// Allows one job per user and MAX_CONCURRENT_JUDGES across all instances.
async function acquire(userId) {
  const max = Number(process.env.MAX_CONCURRENT_JUDGES || 4);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_ID})`;
    await tx.judgeLease.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (await tx.judgeLease.findUnique({ where: { userId } })) throw new HttpError(429, 'You already have a run in progress.');
    if ((await tx.judgeLease.count()) >= max) throw new HttpError(503, 'The judge is busy. Please retry in a few seconds.');
    await tx.judgeLease.create({ data: { userId, expiresAt: expiry() } });
  });
}

export async function withJudgeSlot(userId, fn) {
  await acquire(userId);
  const renew = setInterval(() => {
    prisma.judgeLease.updateMany({ where: { userId }, data: { expiresAt: expiry() } }).catch(() => {});
  }, RENEW_MS);
  try {
    return await fn();
  } finally {
    clearInterval(renew);
    await prisma.judgeLease.deleteMany({ where: { userId } }).catch(() => {});
  }
}
