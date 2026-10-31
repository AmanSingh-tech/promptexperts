import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, optionalAuth, publicUser } from '../middleware/auth.js';
import { badRequest, notFound } from '../lib/http.js';
import { RUBRIC_KEYS } from '../lib/scoring.js';
import { computeStandings } from '../lib/contests.js';
import { ACHIEVEMENTS, STREAK_STATUSES, computeStreak, countedRuns, dayKey, earnedAchievements, nextDayStart } from '../lib/game.js';
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
      status: 'FINAL',
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

// Top three of an ended contest with more than three entrants, once all its reviews are final.
async function contestPodiums(userId) {
  const entries = await prisma.contestEntry.findMany({
    where: { userId, contest: { published: true, endsAt: { lt: new Date() } } },
    include: { contest: true }
  });
  const podiums = [];
  for (const { contest } of entries) {
    const standings = await computeStandings(contest);
    if (standings.length <= 3 || standings.some((r) => r.pending > 0)) continue;
    const mine = standings.find((r) => r.userId === userId);
    if (mine && mine.rank <= 3 && mine.solved > 0) podiums.push(contest.endsAt);
  }
  return podiums;
}

async function streakRuns(solves) {
  const days = [...new Set(solves.filter((s) => STREAK_STATUSES.includes(s.status)).map((s) => dayKey(s.submittedAt)))];
  const dailies = await prisma.dailyChallenge.findMany({ where: { date: { in: days } } });
  return countedRuns(solves, dailies);
}

async function syncAchievements(userId, { evaluated, runs }) {
  const stored = await prisma.achievement.findMany({ where: { userId } });
  const earnedAt = new Map(stored.map((a) => [a.key, a.earnedAt]));

  const earned = earnedAchievements({
    evaluated: evaluated.map((s) => ({ ...s.evaluation, date: s.submittedAt, difficulty: s.problem.difficulty, category: s.problem.category })),
    runs,
    podiums: earnedAt.has('podium') ? [] : await contestPodiums(userId)
  });
  const fresh = [...earned].filter(([key]) => !earnedAt.has(key));
  if (fresh.length) {
    await prisma.achievement.createMany({ data: fresh.map(([key, date]) => ({ userId, key, earnedAt: date })), skipDuplicates: true });
    for (const [key, date] of fresh) earnedAt.set(key, date);
  }
  return ACHIEVEMENTS.map(({ key, title, description }) => ({ key, title, description, earnedAt: earnedAt.get(key) ?? null }));
}

async function playerStats(userId) {
  const solves = await prisma.solve.findMany({
    where: { userId },
    orderBy: { submittedAt: 'asc' },
    select: {
      id: true, status: true, submittedAt: true, problemId: true,
      problem: { select: { title: true, slug: true, difficulty: true, category: true } },
      aiSession: { select: { totalMessages: true } },
      evaluation: true
    }
  });
  for (const s of solves) if (s.evaluation?.status !== 'FINAL') s.evaluation = null;
  const evaluated = solves.filter((s) => s.evaluation);
  const standing = (await computeLeaderboard()).find((r) => r.userId === userId);
  const runs = await streakRuns(solves);
  const streak = computeStreak(runs.map((r) => r.day));
  const achievements = await syncAchievements(userId, { evaluated, runs });

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
    streak,
    achievements,
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

const progressSnapshot = (stats) => ({
  totalPoints: stats.totalPoints,
  rank: stats.rank,
  avgFinalScore: stats.avgFinalScore,
  evaluated: stats.evaluated,
  achievements: stats.achievements.filter((a) => a.earnedAt).map((a) => a.key)
});

// What changed since the player last dismissed a progress update. Compared against a saved
// snapshot rather than per-review events, so several results finishing at once show as one update.
router.get('/me/progress', requireAuth, async (req, res) => {
  const [stats, user] = await Promise.all([
    playerStats(req.user.id),
    prisma.user.findUnique({ where: { id: req.user.id }, select: { progressSeen: true } })
  ]);
  const current = progressSnapshot(stats);
  // New accounts start from a zero snapshot, so only accounts older than this feature have none.
  // Their history isn't news: start them from here rather than celebrating all of it at once.
  const previous = user.progressSeen ?? current;
  if (!user.progressSeen) await prisma.user.update({ where: { id: req.user.id }, data: { progressSeen: current } });
  const seen = new Set(previous.achievements);
  res.json({
    previous,
    current,
    newAchievements: stats.achievements.filter((a) => a.earnedAt && !seen.has(a.key))
  });
});

router.post('/me/progress/seen', requireAuth, async (req, res) => {
  const progressSeen = progressSnapshot(await playerStats(req.user.id));
  await prisma.user.update({ where: { id: req.user.id }, data: { progressSeen } });
  res.status(204).end();
});

const dailySelect = { problem: { select: { id: true, slug: true, title: true, difficulty: true, category: true, type: true, published: true } } };

// Walks through every published problem before repeating one.
async function pickDailyProblem(date) {
  const problems = await prisma.problem.findMany({ where: { published: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (!problems.length) return null;
  const recent = await prisma.dailyChallenge.findMany({ orderBy: { date: 'desc' }, take: problems.length - 1, select: { problemId: true } });
  const used = new Set(recent.map((d) => d.problemId));
  const candidates = problems.filter((p) => !used.has(p.id));
  return candidates[Number(date.replaceAll('-', '')) % candidates.length].id;
}

async function dailyChallenge(date) {
  const row = await prisma.dailyChallenge.findUnique({ where: { date }, include: dailySelect });
  if (row?.problem.published) return row;
  if (row) await prisma.dailyChallenge.delete({ where: { date } });
  const problemId = await pickDailyProblem(date);
  if (!problemId) return null;
  await prisma.dailyChallenge.createMany({ data: [{ date, problemId }], skipDuplicates: true });
  return prisma.dailyChallenge.findUnique({ where: { date }, include: dailySelect });
}

router.get('/daily', optionalAuth, async (req, res) => {
  const now = new Date();
  const date = dayKey(now);
  const daily = await dailyChallenge(date);
  const solves = req.user
    ? await prisma.solve.findMany({
        where: { userId: req.user.id, status: { in: STREAK_STATUSES } },
        select: { problemId: true, status: true, submittedAt: true, evaluation: { select: { status: true, solutionScore: true } } }
      })
    : [];
  const runs = await streakRuns(solves);
  const { published, ...problem } = daily?.problem ?? {};
  res.json({
    date,
    resetsAt: nextDayStart(now),
    problem: daily ? problem : null,
    completed: runs.some((r) => r.daily && r.day === date),
    streak: req.user ? computeStreak(runs.map((r) => r.day), date) : null
  });
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
    prisma.solve.count({ where: { OR: [{ evaluation: { is: null } }, { evaluation: { is: { status: { not: 'FINAL' } } } }] } }),
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
