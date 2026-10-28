import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound, HttpError } from '../lib/http.js';
import { optionalAuth, requireAuth, requireRole, isStaff } from '../middleware/auth.js';
import { computeStandings, contestState } from '../lib/contests.js';

const router = Router();
const ORDER = { LIVE: 0, UPCOMING: 1, ENDED: 2 };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

const problemSummary = { select: { id: true, slug: true, title: true, difficulty: true, category: true, type: true } };

router.get('/', optionalAuth, async (req, res) => {
  const contests = await prisma.contest.findMany({
    where: isStaff(req.user) ? {} : { published: true },
    include: {
      _count: { select: { entries: true, problems: true } },
      ...(req.user && { entries: { where: { userId: req.user.id }, select: { userId: true } } })
    }
  });
  const now = new Date();
  res.json(
    contests
      .map(({ _count, entries, ...c }) => ({
        ...c,
        state: contestState(c, now),
        entrants: _count.entries,
        problemCount: _count.problems,
        joined: Boolean(entries?.length)
      }))
      .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.state === 'ENDED' ? b.endsAt - a.endsAt : a.startsAt - b.startsAt))
  );
});

router.get('/:slug', optionalAuth, async (req, res) => {
  const staff = isStaff(req.user);
  const contest = await prisma.contest.findFirst({
    where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }], ...(staff ? {} : { published: true }) },
    include: { problems: { orderBy: { position: 'asc' }, include: { problem: problemSummary } } }
  });
  if (!contest) throw notFound('Contest not found');
  const state = contestState(contest);
  const joined = req.user
    ? Boolean(await prisma.contestEntry.findUnique({ where: { contestId_userId: { contestId: contest.id, userId: req.user.id } } }))
    : false;
  const showProblems = state !== 'UPCOMING' || staff;
  const { problems, ...rest } = contest;
  res.json({
    ...rest,
    state,
    joined,
    serverTime: new Date(),
    problemCount: problems.length,
    problems: showProblems ? problems.map((p) => p.problem) : [],
    entrants: await prisma.contestEntry.count({ where: { contestId: contest.id } }),
    standings: state === 'UPCOMING' ? [] : await computeStandings(contest)
  });
});

router.post('/:slug/join', requireAuth, async (req, res) => {
  const contest = await prisma.contest.findFirst({ where: { slug: req.params.slug, published: true } });
  if (!contest) throw notFound('Contest not found');
  if (contestState(contest) === 'ENDED') throw new HttpError(409, 'This contest has ended');
  await prisma.contestEntry.upsert({
    where: { contestId_userId: { contestId: contest.id, userId: req.user.id } },
    create: { contestId: contest.id, userId: req.user.id },
    update: {}
  });
  res.status(201).json({ joined: true });
});

async function parseContestBody(body, { partial = false } = {}) {
  const data = {};
  if (!partial || body.title !== undefined) {
    if (!body.title?.trim()) throw badRequest('title is required');
    data.title = body.title.trim().slice(0, 120);
  }
  if (!partial || body.description !== undefined) data.description = String(body.description ?? '');
  for (const key of ['startsAt', 'endsAt']) {
    if (!partial || body[key] !== undefined) {
      const d = new Date(body[key]);
      if (Number.isNaN(d.getTime())) throw badRequest(`${key} must be a valid date`);
      data[key] = d;
    }
  }
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) throw badRequest('endsAt must be after startsAt');
  if (body.published !== undefined) data.published = Boolean(body.published);

  let problemIds;
  if (!partial || body.problemIds !== undefined) {
    if (!Array.isArray(body.problemIds) || !body.problemIds.length) throw badRequest('Pick at least one problem');
    problemIds = [...new Set(body.problemIds.map(String))];
    const found = await prisma.problem.count({ where: { id: { in: problemIds } } });
    if (found !== problemIds.length) throw badRequest('Some problems do not exist');
  }
  return { data, problemIds };
}

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { data, problemIds } = await parseContestBody(req.body ?? {});
  let slug = slugify(req.body.slug || data.title);
  if (!slug) throw badRequest('Could not derive a slug from the title');
  if (await prisma.contest.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const contest = await prisma.contest.create({
    data: { ...data, slug, problems: { create: problemIds.map((problemId, position) => ({ problemId, position })) } }
  });
  res.status(201).json(contest);
});

router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const existing = await prisma.contest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Contest not found');
  const { data, problemIds } = await parseContestBody(req.body ?? {}, { partial: true });
  const startsAt = data.startsAt ?? existing.startsAt;
  const endsAt = data.endsAt ?? existing.endsAt;
  if (endsAt <= startsAt) throw badRequest('endsAt must be after startsAt');
  const contest = await prisma.$transaction(async (tx) => {
    const c = await tx.contest.update({ where: { id: existing.id }, data });
    if (problemIds) {
      await tx.contestProblem.deleteMany({ where: { contestId: c.id } });
      await tx.contestProblem.createMany({ data: problemIds.map((problemId, position) => ({ contestId: c.id, problemId, position })) });
    }
    return c;
  });
  res.json(contest);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.contest.delete({ where: { id: req.params.id } }).catch(() => {
    throw notFound('Contest not found');
  });
  res.status(204).end();
});

export default router;
