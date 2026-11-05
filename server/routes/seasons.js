import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound, HttpError } from '../lib/http.js';
import { requireRole } from '../middleware/auth.js';
import { contestState } from '../lib/contests.js';

const router = Router();
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export const withState = (s, now = new Date()) => ({ ...s, state: contestState(s, now) });

function parseSeasonBody(body, existing) {
  const name = body.name === undefined ? existing?.name : String(body.name).trim().slice(0, 80);
  if (!name) throw badRequest('name is required');
  const dates = {};
  for (const key of ['startsAt', 'endsAt']) {
    if (body[key] === undefined && existing) dates[key] = existing[key];
    else {
      const d = new Date(body[key]);
      if (Number.isNaN(d.getTime())) throw badRequest(`${key} must be a valid date`);
      dates[key] = d;
    }
  }
  if (dates.endsAt <= dates.startsAt) throw badRequest('endsAt must be after startsAt');
  return { name, ...dates };
}

// Seasons can't overlap, so every moment belongs to at most one season.
async function assertNoOverlap({ startsAt, endsAt }, exceptId) {
  const clash = await prisma.season.findFirst({
    where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, ...(exceptId && { id: { not: exceptId } }) }
  });
  if (clash) throw new HttpError(409, `Overlaps ${clash.name}`);
}

router.get('/', async (req, res) => {
  const seasons = await prisma.season.findMany({ orderBy: { startsAt: 'desc' } });
  const now = new Date();
  res.json(seasons.map((s) => withState(s, now)));
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const data = parseSeasonBody(req.body ?? {});
  await assertNoOverlap(data);
  let slug = slugify(req.body.slug || data.name);
  if (!slug) throw badRequest('Could not derive a slug from the name');
  if (await prisma.season.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  res.status(201).json(withState(await prisma.season.create({ data: { ...data, slug } })));
});

router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const existing = await prisma.season.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Season not found');
  const data = parseSeasonBody(req.body ?? {}, existing);
  await assertNoOverlap(data, existing.id);
  res.json(withState(await prisma.season.update({ where: { id: existing.id }, data })));
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.season.delete({ where: { id: req.params.id } }).catch(() => {
    throw notFound('Season not found');
  });
  res.status(204).end();
});

export default router;
