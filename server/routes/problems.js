import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound, intInRange } from '../lib/http.js';
import { optionalAuth, requireRole, isStaff } from '../middleware/auth.js';
import { LANGUAGES } from '../lib/judge.js';

const router = Router();

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const CATEGORIES = ['ALGORITHMS', 'DATA_STRUCTURES', 'SYSTEM_DESIGN', 'WEB_DEV', 'DEBUGGING', 'OTHER'];
const TYPES = ['CODE', 'WRITTEN'];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

router.get('/', optionalAuth, async (req, res) => {
  const { difficulty, category, type, q } = req.query;
  const where = {
    ...(isStaff(req.user) ? {} : { published: true }),
    ...(DIFFICULTIES.includes(difficulty) && { difficulty }),
    ...(CATEGORIES.includes(category) && { category }),
    ...(TYPES.includes(type) && { type }),
    ...(q && { title: { contains: String(q), mode: 'insensitive' } })
  };
  const problems = await prisma.problem.findMany({
    where,
    orderBy: [{ difficulty: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true, slug: true, title: true, difficulty: true, category: true, type: true, published: true,
      tags: { select: { tag: { select: { name: true } } } },
      _count: { select: { solves: true } }
    }
  });

  let solvedIds = new Set();
  if (req.user) {
    const accepted = await prisma.solve.findMany({
      where: { userId: req.user.id, OR: [{ status: 'ACCEPTED' }, { evaluation: { isNot: null } }] },
      select: { problemId: true },
      distinct: ['problemId']
    });
    solvedIds = new Set(accepted.map((s) => s.problemId));
  }

  res.json(
    problems.map(({ tags, _count, ...p }) => ({
      ...p,
      tags: tags.map((t) => t.tag.name),
      submissions: _count.solves,
      solved: solvedIds.has(p.id)
    }))
  );
});

router.get('/:idOrSlug', optionalAuth, async (req, res) => {
  const staff = isStaff(req.user);
  const problem = await prisma.problem.findFirst({
    where: { OR: [{ id: req.params.idOrSlug }, { slug: req.params.idOrSlug }], ...(staff ? {} : { published: true }) },
    include: {
      tags: { select: { tag: { select: { name: true } } } },
      testCases: { orderBy: { position: 'asc' }, ...(staff ? {} : { where: { isSample: true } }) },
      _count: { select: { testCases: true } }
    }
  });
  if (!problem) throw notFound('Problem not found');
  const { tags, _count, ...rest } = problem;
  res.json({ ...rest, tags: tags.map((t) => t.tag.name), totalTests: _count.testCases });
});

function parseProblemBody(body, { partial = false } = {}) {
  const data = {};
  const need = (field) => !partial || body[field] !== undefined;

  if (need('title')) {
    if (!body.title?.trim()) throw badRequest('title is required');
    data.title = body.title.trim().slice(0, 200);
  }
  if (need('description')) {
    if (!body.description?.trim()) throw badRequest('description is required');
    data.description = body.description;
  }
  if (body.difficulty !== undefined) {
    if (!DIFFICULTIES.includes(body.difficulty)) throw badRequest('invalid difficulty');
    data.difficulty = body.difficulty;
  }
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) throw badRequest('invalid category');
    data.category = body.category;
  }
  if (body.type !== undefined) {
    if (!TYPES.includes(body.type)) throw badRequest('invalid type');
    data.type = body.type;
  }
  if (body.constraints !== undefined) data.constraints = body.constraints || null;
  if (body.published !== undefined) data.published = Boolean(body.published);
  if (body.timeLimitMs !== undefined) data.timeLimitMs = intInRange(body.timeLimitMs, 500, 10000, 'timeLimitMs');
  if (body.starterCode !== undefined) {
    const sc = body.starterCode || {};
    if (typeof sc !== 'object' || Object.keys(sc).some((k) => !LANGUAGES[k])) throw badRequest('invalid starterCode');
    data.starterCode = sc;
  }
  return data;
}

function parseTests(testCases) {
  if (!Array.isArray(testCases)) throw badRequest('testCases must be an array');
  return testCases.map((t, i) => {
    if (typeof t?.input !== 'string' || typeof t?.expectedOutput !== 'string') {
      throw badRequest(`testCases[${i}] needs string input and expectedOutput`);
    }
    return { input: t.input, expectedOutput: t.expectedOutput, isSample: Boolean(t.isSample), position: i };
  });
}

async function setTags(tx, problemId, tags) {
  await tx.problemTag.deleteMany({ where: { problemId } });
  for (const name of [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]) {
    const tag = await tx.tag.upsert({ where: { name }, create: { name }, update: {} });
    await tx.problemTag.create({ data: { problemId, tagId: tag.id } });
  }
}

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const data = parseProblemBody(req.body);
  const tests = req.body.testCases ? parseTests(req.body.testCases) : [];
  if ((data.type ?? 'CODE') === 'CODE' && !tests.length) throw badRequest('Code problems need at least one test case');

  let slug = slugify(req.body.slug || data.title);
  if (!slug) throw badRequest('Could not derive a slug from the title');
  if (await prisma.problem.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const problem = await prisma.$transaction(async (tx) => {
    const p = await tx.problem.create({
      data: { ...data, slug, authorId: req.user.id, testCases: { create: tests } }
    });
    if (Array.isArray(req.body.tags)) await setTags(tx, p.id, req.body.tags);
    return p;
  });
  res.status(201).json(problem);
});

router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const existing = await prisma.problem.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Problem not found');
  const data = parseProblemBody(req.body, { partial: true });
  const tests = req.body.testCases !== undefined ? parseTests(req.body.testCases) : null;

  const problem = await prisma.$transaction(async (tx) => {
    const p = await tx.problem.update({ where: { id: existing.id }, data });
    if (tests) {
      await tx.testCase.deleteMany({ where: { problemId: p.id } });
      await tx.testCase.createMany({ data: tests.map((t) => ({ ...t, problemId: p.id })) });
    }
    if (Array.isArray(req.body.tags)) await setTags(tx, p.id, req.body.tags);
    return p;
  });
  res.json(problem);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.problem.delete({ where: { id: req.params.id } }).catch(() => {
    throw notFound('Problem not found');
  });
  res.status(204).end();
});

export { CATEGORIES, DIFFICULTIES, TYPES };
export default router;
