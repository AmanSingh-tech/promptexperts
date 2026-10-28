import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound, forbidden, intInRange, HttpError } from '../lib/http.js';
import { requireAuth, requireRole, isStaff } from '../middleware/auth.js';
import { analyzeSession } from '../lib/ai-metrics.js';
import { reviewAiUsage } from '../lib/claude.js';
import { RUBRIC_KEYS, aggregateReviews, requiredReviews } from '../lib/scoring.js';

const router = Router();
const staffOnly = requireRole('REVIEWER', 'ADMIN');

const reviewerSelect = { reviewer: { select: { id: true, username: true } } };

router.get('/queue', staffOnly, async (req, res) => {
  const status = ['todo', 'disputed', 'final'].includes(req.query.status) ? req.query.status : 'todo';
  const me = req.user.id;
  const where =
    status === 'todo'
      ? {
          userId: { not: me },
          reviews: { none: { reviewerId: me } },
          OR: [{ evaluation: { is: null } }, { evaluation: { is: { status: 'PENDING' } } }]
        }
      : { evaluation: { is: { status: status === 'disputed' ? 'DISPUTED' : 'FINAL' } } };

  const solves = await prisma.solve.findMany({
    where: { ...where, ...(req.query.problemId && { problemId: String(req.query.problemId) }) },
    orderBy: { submittedAt: status === 'final' ? 'desc' : 'asc' },
    take: 200,
    select: {
      id: true, status: true, passedCount: true, totalCount: true, autoScore: true, submittedAt: true, language: true,
      user: { select: { id: true, username: true } },
      problem: { select: { id: true, title: true, type: true, difficulty: true, category: true } },
      aiSession: { select: { totalMessages: true, runCount: true } },
      evaluation: { select: { finalScore: true, status: true, reviewCount: true, reviewer: { select: { username: true } } } },
      reviews: { select: { reviewerId: true } }
    }
  });
  res.json({
    requiredReviews: requiredReviews(),
    items: solves.map(({ reviews, ...s }) => ({ ...s, reviewCount: reviews.length, reviewedByMe: reviews.some((r) => r.reviewerId === me) }))
  });
});

async function loadForAnalysis(solveId) {
  const solve = await prisma.solve.findUnique({
    where: { id: solveId },
    include: {
      problem: true,
      aiSession: { include: { logs: { orderBy: { timestamp: 'asc' } }, events: { orderBy: { createdAt: 'asc' } } } }
    }
  });
  if (!solve) throw notFound('Submission not found');
  return solve;
}

router.get('/:solveId/analysis', staffOnly, async (req, res) => {
  const solve = await loadForAnalysis(req.params.solveId);
  const heuristic = analyzeSession({
    logs: solve.aiSession?.logs ?? [],
    events: solve.aiSession?.events ?? [],
    finalCode: solve.code,
    problemType: solve.problem.type
  });
  res.json({ ...heuristic, ai: solve.autoReview?.ai ?? null });
});

router.post('/:solveId/ai-review', staffOnly, async (req, res) => {
  const solve = await loadForAnalysis(req.params.solveId);
  const logs = solve.aiSession?.logs ?? [];
  const heuristic = analyzeSession({ logs, events: solve.aiSession?.events ?? [], finalCode: solve.code, problemType: solve.problem.type });
  const ai = await reviewAiUsage({ problem: solve.problem, solve, logs, metrics: heuristic.metrics });
  const autoReview = { ai: { ...ai, generatedAt: new Date().toISOString() } };
  await prisma.solve.update({ where: { id: solve.id }, data: { autoReview } });
  res.json({ ...heuristic, ai: autoReview.ai });
});

// Blind review: a reviewer sees other reviewers' scores only after submitting their own. Admins see everything.
router.get('/:solveId/reviews', staffOnly, async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { solveId: req.params.solveId },
    orderBy: { createdAt: 'asc' },
    include: reviewerSelect
  });
  const mine = reviews.find((r) => r.reviewerId === req.user.id) ?? null;
  const visible = req.user.role === 'ADMIN' || mine;
  const evaluation = await prisma.evaluation.findUnique({ where: { solveId: req.params.solveId } });
  res.json({
    requiredReviews: requiredReviews(),
    count: reviews.length,
    mine,
    hidden: !visible,
    reviews: visible ? reviews : [],
    evaluation: visible ? evaluation : null
  });
});

async function recompute(solve) {
  const reviews = await prisma.review.findMany({ where: { solveId: solve.id }, orderBy: { updatedAt: 'asc' } });
  const latest = reviews[reviews.length - 1];
  const agg = aggregateReviews(reviews, { problemType: solve.problem.type, autoScore: solve.autoScore });
  const status = reviews.length < requiredReviews() ? 'PENDING' : agg.disagreement ? 'DISPUTED' : 'FINAL';
  const data = {
    ...agg.rubric,
    solutionScore: agg.solutionScore,
    aiUsageScore: agg.aiUsageScore,
    finalScore: agg.finalScore,
    status,
    reviewCount: reviews.length,
    reviewerId: latest.reviewerId,
    notes: latest.notes
  };
  return prisma.evaluation.upsert({ where: { solveId: solve.id }, create: { ...data, solveId: solve.id }, update: data });
}

router.put('/:solveId', staffOnly, async (req, res) => {
  const solve = await prisma.solve.findUnique({ where: { id: req.params.solveId }, include: { problem: true } });
  if (!solve) throw notFound('Submission not found');
  if (solve.userId === req.user.id) throw forbidden('You cannot review your own submission');

  const body = req.body ?? {};
  const rubric = Object.fromEntries(RUBRIC_KEYS.map((k) => [k, intInRange(body[k], 1, 5, k)]));
  const solutionScore = solve.problem.type === 'CODE' ? null : intInRange(body.solutionScore, 0, 100, 'solutionScore');
  const notes = String(body.notes ?? '').slice(0, 5000);
  if (!notes.trim()) throw badRequest('Please add reviewer notes explaining the scores');

  const data = { ...rubric, solutionScore, notes };
  const review = await prisma.review.upsert({
    where: { solveId_reviewerId: { solveId: solve.id, reviewerId: req.user.id } },
    create: { ...data, solveId: solve.id, reviewerId: req.user.id },
    update: data
  });
  const evaluation = await recompute(solve);
  res.json({ ...evaluation, myReview: review });
});

router.post('/:solveId/accept', requireRole('ADMIN'), async (req, res) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { solveId: req.params.solveId } });
  if (!evaluation) throw notFound('Not evaluated yet');
  if (evaluation.status !== 'DISPUTED') throw new HttpError(409, 'Only disputed results need to be accepted');
  res.json(await prisma.evaluation.update({ where: { solveId: req.params.solveId }, data: { status: 'FINAL' } }));
});

router.get('/:solveId', requireAuth, async (req, res) => {
  const evaluation = await prisma.evaluation.findUnique({
    where: { solveId: req.params.solveId },
    include: { reviewer: { select: { username: true } }, solve: { select: { userId: true } } }
  });
  if (!evaluation) throw notFound('Not evaluated yet');
  const staff = isStaff(req.user);
  if (evaluation.solve.userId !== req.user.id && !staff) throw forbidden();
  if (!staff && evaluation.status !== 'FINAL') throw notFound('Not evaluated yet');
  res.json(evaluation);
});

export default router;
