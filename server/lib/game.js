// Game rules. None of these award XP: XP stays the sum of best reviewed scores, so the
// leaderboards measure the same thing whether or not someone plays every day.

// Passing code, or a written answer sent for review. Failed attempts don't keep a streak alive.
export const STREAK_STATUSES = ['ACCEPTED', 'MANUAL_REVIEW'];
export const MIN_WRITTEN_SOLUTION = 50;

const DAY_MS = 86400000;

// Days are UTC, so a streak means the same thing for everyone.
export const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

export function nextDayStart(now = new Date()) {
  return new Date(Math.floor(now.getTime() / DAY_MS + 1) * DAY_MS);
}

const dayNumber = (key) => Date.parse(`${key}T00:00:00Z`) / DAY_MS;

// The submissions that count towards streaks and daily clears. A repeat only counts on the day
// its challenge is the daily, so resubmitting one easy answer can't carry a streak. Written
// answers count from submission, so nobody waits on reviewers, but stay unconfirmed until
// reviewed and drop out if the reviewer scores them below MIN_WRITTEN_SOLUTION.
export function countedRuns(solves, dailies = []) {
  const dailyByDay = new Map(dailies.map((d) => [d.date, d.problemId]));
  const seen = new Set();
  const runs = [];
  for (const s of [...solves].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))) {
    if (!STREAK_STATUSES.includes(s.status)) continue;
    const written = s.status === 'MANUAL_REVIEW';
    const reviewed = s.evaluation?.status === 'FINAL';
    if (written && reviewed && s.evaluation.solutionScore < MIN_WRITTEN_SOLUTION) continue;
    const day = dayKey(s.submittedAt);
    const daily = dailyByDay.get(day) === s.problemId;
    if (seen.has(s.problemId) && !daily) continue;
    seen.add(s.problemId);
    runs.push({ problemId: s.problemId, date: new Date(s.submittedAt), day, daily, confirmed: !written || reviewed });
  }
  return runs;
}

// A streak survives until a full UTC day passes without a qualifying submission.
export function computeStreak(days, today = dayKey(new Date())) {
  const sorted = [...new Set(days)].map(dayNumber).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const last = sorted[sorted.length - 1];
  const todayNumber = dayNumber(today);
  const alive = last === todayNumber || last === todayNumber - 1;
  return { current: alive ? run : 0, best, activeToday: last === todayNumber };
}

export const ACHIEVEMENTS = [
  { key: 'first-run', title: 'Off the line', description: 'Get your first run reviewed', earned: (f) => f.evaluated.length >= 1 },
  { key: 'veteran', title: 'Veteran', description: 'Get 5 runs reviewed', earned: (f) => f.evaluated.length >= 5 },
  { key: 'prompt-master', title: 'Prompt master', description: 'Score 100 for AI usage on a run', earned: (f) => f.evaluated.some((e) => e.aiUsageScore === 100) },
  { key: 'flawless', title: 'Flawless', description: 'Score 90+ overall with a perfect solution', earned: (f) => f.evaluated.some((e) => e.solutionScore === 100 && e.finalScore >= 90) },
  { key: 'hard-mode', title: 'Hard mode', description: 'Score 75+ on a hard challenge', earned: (f) => f.evaluated.some((e) => e.difficulty === 'HARD' && e.finalScore >= 75) },
  { key: 'all-rounder', title: 'All-rounder', description: 'Get runs reviewed in 3 categories', earned: (f) => new Set(f.evaluated.map((e) => e.category)).size >= 3 },
  { key: 'streak-3', title: 'Warming up', description: 'Reach a 3-day streak', earned: (f) => f.bestStreak >= 3 },
  { key: 'streak-7', title: 'On fire', description: 'Reach a 7-day streak', earned: (f) => f.bestStreak >= 7 },
  { key: 'daily-5', title: 'Daily driver', description: 'Clear 5 daily challenges', earned: (f) => f.dailyCleared >= 5 },
  { key: 'podium', title: 'Podium finish', description: 'Finish top 3 in a contest with more than 3 entrants', earned: (f) => f.podiums >= 1 },
  { key: 'season-podium', title: 'Season medal', description: 'Finish top 3 on a season XP board with more than 3 players', earned: (f) => f.seasonPodiums >= 1 }
];

// Replays a player's history to find when each achievement was first reached. Only confirmed
// runs count here: achievements are permanent, and an unreviewed answer could still be rejected.
// facts: evaluated [{ date, ...scores }], runs from countedRuns, podiums and seasonPodiums [date].
export function earnedAchievements({ evaluated, runs, podiums, seasonPodiums = [] }) {
  const confirmed = runs.filter((r) => r.confirmed);
  const dates = [...evaluated.map((e) => e.date), ...confirmed.map((r) => r.date), ...podiums, ...seasonPodiums].sort((a, b) => a - b);
  const earned = new Map();
  for (const date of dates) {
    const upTo = confirmed.filter((r) => r.date <= date);
    const facts = {
      evaluated: evaluated.filter((e) => e.date <= date),
      bestStreak: computeStreak(upTo.map((r) => r.day)).best,
      dailyCleared: new Set(upTo.filter((r) => r.daily).map((r) => r.day)).size,
      podiums: podiums.filter((d) => d <= date).length,
      seasonPodiums: seasonPodiums.filter((d) => d <= date).length
    };
    for (const a of ACHIEVEMENTS) if (!earned.has(a.key) && a.earned(facts)) earned.set(a.key, date);
  }
  return earned;
}
