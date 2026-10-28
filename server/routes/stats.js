import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, optionalAuth, publicUser } from '../middleware/auth.js';
import { badRequest, notFound } from '../lib/http.js';
import { RUBRIC_KEYS } from '../lib/scoring.js';
import { CATEGORIES, DIFFICULTIES } from './problems.js';

const router = Router();

const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export const BOARDS = ['xp', 'ai', 'solution'];
const PERIOD_DAYS = { week: 7, month: 30 };
export const MIN_FOR_AVERAGE = 2;

async function computeLeaderboard({ category, difficulty, period, board = 'xp' } = {}) {
  const days = PERIOD_DAYS[period];
  const evaluations = await prisma.evaluation.findMany({
    where: {
      solve: {
        ...(days && { submittedAt: { gte: new Date(Date.now() - days * 86400000) } }),
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

  let rows = [...users.values()].map(({ entries, ...u }) => ({
    ...u,
    problemsEvaluated: entries.length,
    totalPoints: entries.reduce((s, e) => s + e.finalScore, 0),
    avgSolutionScore: avg(entries.map((e) => e.solutionScore)),
    avgAiUsageScore: avg(entries.map((e) => e.aiUsageScore)),
    avgFinalScore: avg(entries.map((e) => e.finalScore))
  }));

  if (board === 'xp') {
    rows.sort((a, b) => b.totalPoints - a.totalPoints || b.avgAiUsageScore - a.avgAiUsageScore);
  } else {
    // Average boards need a minimum sample so one lucky run can't top them.
    const key = board === 'ai' ? 'avgAiUsageScore' : 'avgSolutionScore';
    rows = rows
      .filter((r) => r.problemsEvaluated >= MIN_FOR_AVERAGE)
      .sort((a, b) => b[key] - a[key] || b.problemsEvaluated - a.problemsEvaluated || b.totalPoints - a.totalPoints);
  }
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

router.get('/leaderboard', optionalAuth, async (req, res) => {
  const board = BOARDS.includes(req.query.board) ? req.query.board : 'xp';
  const period = PERIOD_DAYS[req.query.period] ? req.query.period : 'all';
  const rows = await computeLeaderboard({ ...req.query, board, period });
  res.json({
    board,
    period,
    minForAverage: MIN_FOR_AVERAGE,
    total: rows.length,
    rows: rows.slice(0, 100),
    me: req.user ? rows.find((r) => r.userId === req.user.id) ?? null : null
  });
});

async function playerStats(userId) {
  const solves = await prisma.solve.findMany({
    where: { userId },
    orderBy: { submittedAt: 'asc' },
    select: {
      id: true, status: true, submittedAt: true, problemId: true,
      problem: { select: { title: true, slug: true, difficulty: true } },
      aiSession: { select: { totalMessages: true } },
      evaluation: true
    }
  });
  const evaluated = solves.filter((s) => s.evaluation);
  const standing = (await computeLeaderboard()).find((r) => r.userId === userId);

  const cleared = new Map();
  for (const s of solves) {
    if (s.status !== 'ACCEPTED' && !s.evaluation) continue;
    const prev = cleared.get(s.problemId);
    const score = s.evaluation?.finalScore ?? null;
    if (!prev || (score ?? -1) > (prev.bestFinalScore ?? -1)) {
      cleared.set(s.problemId, { slug: s.problem.slug, title: s.problem.title, difficulty: s.problem.difficulty, bestFinalScore: score });
    }
  }

  return {
    totalPoints: standing?.totalPoints ?? 0,
    rank: standing?.rank ?? null,
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
    cleared: [...cleared.values()],
    timeline: evaluated.map((s) => ({
      solveId: s.id,
      problem: s.problem.title,
      slug: s.problem.slug,
      date: s.submittedAt,
      solutionScore: s.evaluation.solutionScore,
      aiUsageScore: s.evaluation.aiUsageScore,
      finalScore: s.evaluation.finalScore
    }))
  };
}

router.get('/me/stats', requireAuth, async (req, res) => {
  res.json(await playerStats(req.user.id));
});

router.get('/players/:username', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) throw notFound('Player not found');
  const stats = await playerStats(user.id);
  // Public view: submissions (code and transcripts) stay private, so drop their ids.
  res.json({
    player: { username: user.username, firstName: user.firstName, role: user.role, joinedAt: user.createdAt },
    ...stats,
    timeline: stats.timeline.map(({ solveId, ...t }) => t)
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
