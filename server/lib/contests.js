import { prisma } from './prisma.js';

export function contestState(contest, now = new Date()) {
  if (now < contest.startsAt) return 'UPCOMING';
  if (now > contest.endsAt) return 'ENDED';
  return 'LIVE';
}

// Problems visible to non-staff: published ones, plus unpublished ones in a contest that has started.
export function visibleProblemWhere(now = new Date()) {
  return {
    OR: [{ published: true }, { contests: { some: { contest: { published: true, startsAt: { lte: now } } } } }]
  };
}

export async function computeStandings(contest) {
  const [entries, solves] = await Promise.all([
    prisma.contestEntry.findMany({ where: { contestId: contest.id }, include: { user: { select: { id: true, username: true } } } }),
    prisma.solve.findMany({
      where: { contestId: contest.id },
      select: { userId: true, problemId: true, submittedAt: true, evaluation: { select: { status: true, finalScore: true } } }
    })
  ]);

  const rows = new Map(
    entries.map((e) => [e.userId, { userId: e.userId, username: e.user.username, total: 0, solved: 0, pending: 0, lastImprovementAt: null, cells: {} }])
  );
  for (const s of solves) {
    const row = rows.get(s.userId);
    if (!row) continue;
    const cell = (row.cells[s.problemId] ??= { best: null, pending: 0, bestAt: null });
    if (s.evaluation?.status === 'FINAL') {
      if (cell.best == null || s.evaluation.finalScore > cell.best) {
        cell.best = s.evaluation.finalScore;
        cell.bestAt = s.submittedAt;
      }
    } else {
      cell.pending++;
    }
  }
  for (const row of rows.values()) {
    for (const cell of Object.values(row.cells)) {
      row.pending += cell.pending;
      if (cell.best == null) continue;
      row.total += cell.best;
      row.solved++;
      if (!row.lastImprovementAt || cell.bestAt > row.lastImprovementAt) row.lastImprovementAt = cell.bestAt;
    }
  }
  // Higher total first; ties go to whoever reached their total earlier.
  return [...rows.values()]
    .sort((a, b) => b.total - a.total || (a.lastImprovementAt ?? Infinity) - (b.lastImprovementAt ?? Infinity) || a.username.localeCompare(b.username))
    .map((r, i) => ({ rank: i + 1, ...r }));
}
