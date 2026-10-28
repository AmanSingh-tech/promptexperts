import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { readFile } from 'node:fs/promises';
import { problems, starter } from './seed/problems.js';

const expected = JSON.parse(await readFile(new URL('./seed/expected.json', import.meta.url), 'utf8'));

async function ensureUser(username, role, password) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      username,
      email: `${username}@ailogracer.local`,
      password: await bcrypt.hash(password, 10),
      firstName: username[0].toUpperCase() + username.slice(1),
      role
    }
  });
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin12345';
  const reviewerPassword = process.env.SEED_REVIEWER_PASSWORD || 'reviewer12345';
  const admin = await ensureUser('admin', 'ADMIN', adminPassword);
  await ensureUser('reviewer', 'REVIEWER', reviewerPassword);

  for (const p of problems) {
    if (await prisma.problem.findUnique({ where: { slug: p.slug } })) continue;
    const type = p.type ?? 'CODE';
    const created = await prisma.problem.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        category: p.category,
        type,
        constraints: p.constraints ?? null,
        starterCode: type === 'CODE' ? starter : undefined,
        authorId: admin.id,
        testCases: {
          create: (p.tests ?? []).map((t, i) => ({
            input: t.input,
            expectedOutput: expected[p.slug][i],
            isSample: Boolean(t.sample),
            position: i
          }))
        }
      }
    });
    for (const name of p.tags ?? []) {
      const tag = await prisma.tag.upsert({ where: { name }, create: { name }, update: {} });
      await prisma.problemTag.create({ data: { problemId: created.id, tagId: tag.id } });
    }
    console.log(`+ ${p.title}`);
  }
  console.log(`Seeded. Accounts: admin / ${adminPassword} (ADMIN), reviewer / ${reviewerPassword} (REVIEWER). Change these passwords outside local dev.`);
}

main().finally(() => prisma.$disconnect());
