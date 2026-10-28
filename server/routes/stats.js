import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, publicUser } from '../middleware/auth.js';
import { badRequest, notFound } from '../lib/http.js';
import { RUBRIC_KEYS } from '../lib/scoring.js';
import { CATEGORIES, DIFFICULTIES } from './problems.js';

const router = Router();

const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

router.get('/leaderboard', async (req, res) => {
  const { category, difficulty } = req.query;
  const evaluations = await prisma.evaluation.findMany({
    where: {
      solve: {
        problem: {
          ...(CATEGORIES.includes(category) && { category }),
          ...(DIFFICULTIES.includes(difficulty) && { difficulty })
        }
      }
    },
    select: {
      solutionScore: true, aiUsageScore: true, finalScore: true,
      solve: { select: { problemId: true, user: { select: { id: true, username: true } } } }
    }
  });

  // Best evaluation per (user, problem), so resubmitting cannot inflate totals.
  const best = new Map();
  for (const e of evaluations) {
    const key = `${e.solve.user.id}:${e.solve.problemId}`;
    if (!best.has(key) || best.get(key).finalScore < e.finalScore) best.set(key, e);
  }

  const users = new Map();
  for (const e of best.values()) {
    const u = users.get(e.solve.user.id) ?? { userId: e.solve.user.id, username: e.solve.user.username, entries: [] };
    u.entries.push(e);
    users.set(u.userId, u);
  }

  const rows = [...users.values()]
    .map(({ entries, ...u }) => ({
      ...u,
      problemsEvaluated: entries.length,
      totalPoints: entries.reduce((s, e) => s + e.finalScore, 0),
      avgSolutionScore: avg(entries.map((e) => e.solutionScore)),
      avgAiUsageScore: avg(entries.map((e) => e.aiUsageScore)),
      avgFinalScore: avg(entries.map((e) => e.finalScore))
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.avgAiUsageScore - a.avgAiUsageScore)
    .slice(0, 100)
    .map((r, i) => ({ rank: i + 1, ...r }));
  res.json(rows);
});

router.get('/me/stats', requireAuth, async (req, res) => {
  const solves = await prisma.solve.findMany({
    where: { userId: req.user.id },
    orderBy: { submittedAt: 'asc' },
    select: {
      id: true, status: true, submittedAt: true, problemId: true,
      problem: { select: { title: true } },
      aiSession: { select: { totalMessages: true, inputTokens: true, outputTokens: true } },
      evaluation: true
    }
  });
  const evaluated = solves.filter((s) => s.evaluation);
  res.json({
    submissions: solves.length,
    problemsAttempted: new Set(solves.map((s) => s.problemId)).size,
    accepted: solves.filter((s) => s.status === 'ACCEPTED').length,
    evaluated: evaluated.length,
    avgSolutionScore: avg(evaluated.map((s) => s.evaluation.solutionScore)),
    avgAiUsageScore: avg(evaluated.map((s) => s.evaluation.aiUsageScore)),
    avgFinalScore: avg(evaluated.map((s) => s.evaluation.finalScore)),
    rubric: Object.fromEntries(
      RUBRIC_KEYS.map((k) => [k, evaluated.length ? +(evaluated.reduce((a, s) => a + s.evaluation[k], 0) / evaluated.length).toFixed(1) : null])
    ),
    avgMessagesPerAttempt: avg(solves.map((s) => s.aiSession?.totalMessages ?? 0)),
    timeline: evaluated.map((s) => ({
      solveId: s.id,
      problem: s.problem.title,
      date: s.submittedAt,
      solutionScore: s.evaluation.solutionScore,
      aiUsageScore: s.evaluation.aiUsageScore,
      finalScore: s.evaluation.finalScore
    }))
  });
});

const adminOnly = requireRole('ADMIN');

router.get('/admin/users', adminOnly, async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { solves: true, reviews: true } } }
  });
  res.json(users.map((u) => ({ ...publicUser(u), createdAt: u.createdAt, submissions: u._count.solves, reviews: u._count.reviews })));
});

router.patch('/admin/users/:id/role', adminOnly, async (req, res) => {
  const { role } = req.body ?? {};
  if (!['USER', 'REVIEWER', 'ADMIN'].includes(role)) throw badRequest('invalid role');
  if (req.params.id === req.user.id) throw badRequest('You cannot change your own role');
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } }).catch(() => {
    throw notFound('User not found');
  });
  res.json(publicUser(user));
});

router.get('/admin/overview', adminOnly, async (req, res) => {
  const [users, problems, submissions, pending, sessions, tokens] = await Promise.all([
    prisma.user.count(),
    prisma.problem.count(),
    prisma.solve.count(),
    prisma.solve.count({ where: { evaluation: { is: null } } }),
    prisma.aISession.count(),
    prisma.aISession.aggregate({ _sum: { inputTokens: true, outputTokens: true } })
  ]);
  res.json({
    users, problems, submissions, pendingReviews: pending, sessions,
    inputTokens: tokens._sum.inputTokens ?? 0,
    outputTokens: tokens._sum.outputTokens ?? 0
  });
});

export default router;
