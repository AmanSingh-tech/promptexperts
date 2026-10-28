import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound, forbidden, intInRange } from '../lib/http.js';
import { requireAuth, requireRole, isStaff } from '../middleware/auth.js';
import { analyzeSession } from '../lib/ai-metrics.js';
import { reviewAiUsage } from '../lib/claude.js';
import { RUBRIC_KEYS, aiUsageScore, finalScore } from '../lib/scoring.js';

const router = Router();
const staffOnly = requireRole('REVIEWER', 'ADMIN');

router.get('/queue', staffOnly, async (req, res) => {
  const status = req.query.status === 'reviewed' ? 'reviewed' : 'pending';
  const solves = await prisma.solve.findMany({
    where: {
      evaluation: status === 'pending' ? { is: null } : { isNot: null },
      ...(req.query.problemId && { problemId: String(req.query.problemId) })
    },
    orderBy: { submittedAt: status === 'pending' ? 'asc' : 'desc' },
    take: 200,
    select: {
      id: true, status: true, passedCount: true, totalCount: true, autoScore: true, submittedAt: true, language: true,
      user: { select: { id: true, username: true } },
      problem: { select: { id: true, title: true, type: true, difficulty: true, category: true } },
      aiSession: { select: { totalMessages: true, runCount: true } },
      evaluation: { select: { finalScore: true, reviewer: { select: { username: true } } } }
    }
  });
  res.json(solves);
});

async function loadForAnalysis(solveId) {
  const solve = await prisma.solve.findUnique({
    where: { id: solveId },
    include: {
      problem: true,
      aiSession: { include: { logs: { orderBy: { timestamp: 'asc' } } } }
    }
  });
  if (!solve) throw notFound('Submission not found');
  return solve;
}

router.get('/:solveId/analysis', staffOnly, async (req, res) => {
  const solve = await loadForAnalysis(req.params.solveId);
  const heuristic = analyzeSession({
    logs: solve.aiSession?.logs ?? [],
    finalCode: solve.code,
    problemType: solve.problem.type
  });
  res.json({ ...heuristic, ai: solve.autoReview?.ai ?? null });
});

router.post('/:solveId/ai-review', staffOnly, async (req, res) => {
  const solve = await loadForAnalysis(req.params.solveId);
  const logs = solve.aiSession?.logs ?? [];
  const heuristic = analyzeSession({ logs, finalCode: solve.code, problemType: solve.problem.type });
  const ai = await reviewAiUsage({ problem: solve.problem, solve, logs, metrics: heuristic.metrics });
  const autoReview = { ai: { ...ai, generatedAt: new Date().toISOString() } };
  await prisma.solve.update({ where: { id: solve.id }, data: { autoReview } });
  res.json({ ...heuristic, ai: autoReview.ai });
});

router.put('/:solveId', staffOnly, async (req, res) => {
  const solve = await prisma.solve.findUnique({ where: { id: req.params.solveId }, include: { problem: true } });
  if (!solve) throw notFound('Submission not found');
  if (solve.userId === req.user.id) throw forbidden('You cannot review your own submission');

  const body = req.body ?? {};
  const rubric = Object.fromEntries(RUBRIC_KEYS.map((k) => [k, intInRange(body[k], 1, 5, k)]));
  const solutionScore =
    solve.problem.type === 'CODE' ? solve.autoScore ?? 0 : intInRange(body.solutionScore, 0, 100, 'solutionScore');
  const notes = body.notes == null ? null : String(body.notes).slice(0, 5000);
  if (!notes?.trim()) throw badRequest('Please add reviewer notes explaining the scores');

  const usage = aiUsageScore(rubric);
  const data = {
    ...rubric,
    solutionScore,
    aiUsageScore: usage,
    finalScore: finalScore(solutionScore, usage),
    notes,
    reviewerId: req.user.id
  };
  const evaluation = await prisma.evaluation.upsert({
    where: { solveId: solve.id },
    create: { ...data, solveId: solve.id },
    update: data
  });
  res.json(evaluation);
});

router.get('/:solveId', requireAuth, async (req, res) => {
  const evaluation = await prisma.evaluation.findUnique({
    where: { solveId: req.params.solveId },
    include: { reviewer: { select: { username: true } }, solve: { select: { userId: true } } }
  });
  if (!evaluation) throw notFound('Not evaluated yet');
  if (evaluation.solve.userId !== req.user.id && !isStaff(req.user)) throw forbidden();
  res.json(evaluation);
});

export default router;
