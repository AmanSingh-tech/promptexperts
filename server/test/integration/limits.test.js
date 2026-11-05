import { test, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
await import('dotenv/config');
const { prisma } = await import('../../lib/prisma.js');
const { createLimiter } = await import('../../lib/rate-limit.js');
const { withJudgeSlot } = await import('../../lib/judge-slots.js');

const suffix = `l${Date.now().toString(36)}`;

after(async () => {
  await prisma.rateLimit.deleteMany({ where: { key: { contains: suffix } } });
  await prisma.judgeLease.deleteMany({ where: { userId: { startsWith: suffix } } });
  await prisma.$disconnect();
});

test('two limiter instances share one count', async () => {
  const a = createLimiter({ name: suffix, limit: 3, windowMs: 60000 });
  const b = createLimiter({ name: suffix, limit: 3, windowMs: 60000 });
  await Promise.all([a.hit('k'), b.hit('k'), a.hit('k')]);
  assert.equal(await b.blocked('k'), true);
  await a.clear('k');
  assert.equal(await b.blocked('k'), false);
});

test('an expired window starts counting again', async () => {
  const l = createLimiter({ name: suffix, limit: 1, windowMs: 60000 });
  await l.hit('old');
  await prisma.rateLimit.update({ where: { key: `${suffix}:old` }, data: { resetAt: new Date(Date.now() - 1000) } });
  assert.equal(await l.blocked('old'), false);
  await l.hit('old');
  assert.equal((await prisma.rateLimit.findUnique({ where: { key: `${suffix}:old` } })).count, 1);
});

test('a user holds one judge slot and it is released afterwards', async () => {
  const user = `${suffix}a`;
  await withJudgeSlot(user, () =>
    assert.rejects(withJudgeSlot(user, async () => {}), (e) => e.status === 429)
  );
  assert.equal(await withJudgeSlot(user, async () => 'free'), 'free');
});

test('the judge cap holds across concurrent requests and a failed job frees its slot', async () => {
  process.env.MAX_CONCURRENT_JUDGES = '2';
  let release;
  const gate = new Promise((r) => (release = r));
  const results = await Promise.allSettled(
    [...Array(2).keys()].map((i) => withJudgeSlot(`${suffix}c${i}`, () => gate)).concat(
      new Promise((r) => setTimeout(r, 300)).then(() => withJudgeSlot(`${suffix}c9`, async () => {})).finally(release)
    )
  );
  delete process.env.MAX_CONCURRENT_JUDGES;
  assert.equal(results[2].status, 'rejected');
  assert.equal(results[2].reason.status, 503);
  await assert.rejects(withJudgeSlot(`${suffix}f`, async () => { throw new Error('boom'); }), /boom/);
  assert.equal(await prisma.judgeLease.count({ where: { userId: `${suffix}f` } }), 0);
});

test('a lease left by a dead instance expires', async () => {
  const user = `${suffix}d`;
  await prisma.judgeLease.create({ data: { userId: user, expiresAt: new Date(Date.now() - 1000) } });
  assert.equal(await withJudgeSlot(user, async () => 'recovered'), 'recovered');
});
