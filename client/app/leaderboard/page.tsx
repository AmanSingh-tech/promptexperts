'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/lib/format';
import { levelFor, plural, tierFor } from '@/lib/game';
import type { Board, Category, Difficulty, LeaderboardResponse, LeaderboardRow, Period } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { TierBadge } from '@/components/TierBadge';
import { Card, EmptyState, ErrorBox, PageHeader, ScorePill, Spinner, cx, inputClass } from '@/components/ui';

const BOARDS: { value: Board; label: string; metric: (r: LeaderboardRow) => number; unit: string; blurb: (min: number) => string }[] = [
  { value: 'xp', label: 'XP', metric: (r) => r.totalPoints, unit: 'XP', blurb: () => "Sum of each player's best final score per challenge." },
  { value: 'ai', label: 'AI mastery', metric: (r) => r.avgAiUsageScore, unit: 'AI', blurb: (min) => `Average AI-usage score. Needs at least ${min} reviewed challenges to qualify.` },
  { value: 'solution', label: 'Solvers', metric: (r) => r.avgSolutionScore, unit: 'SOL', blurb: (min) => `Average solution score. Needs at least ${min} reviewed challenges to qualify.` }
];

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'month', label: '30 days' },
  { value: 'week', label: '7 days' }
];

const PODIUM = [
  { ring: 'shadow-[0_0_0_1px_rgb(252_211_77_/_0.5),0_0_40px_-12px_rgb(252_211_77_/_0.7)]', medal: 'from-amber-200 to-amber-500', offset: 'sm:pt-0', order: 'sm:order-2' },
  { ring: 'shadow-[0_0_0_1px_rgb(203_213_225_/_0.35)]', medal: 'from-slate-100 to-slate-400', offset: 'sm:pt-8', order: 'sm:order-1' },
  { ring: 'shadow-[0_0_0_1px_rgb(251_146_60_/_0.35)]', medal: 'from-orange-300 to-orange-600', offset: 'sm:pt-12', order: 'sm:order-3' }
];

const col = (board: Board, b: Board) => (board === b ? 'text-base' : 'hidden opacity-80 sm:table-cell');

function Row({ r, board, me }: { r: LeaderboardRow; board: Board; me: boolean }) {
  const hl = (b: Board) => col(board, b);
  return (
    <tr className={cx(me && 'bg-neon-400/[0.06] shadow-[inset_2px_0_0_rgb(63_227_242)]')}>
      <td className="px-4 py-3 font-mono font-semibold tabular-nums text-slate-300">#{r.rank}</td>
      <td className="px-4 py-3">
        <Link href={`/players/${r.username}`} className="font-semibold text-white hover:text-neon-300">{r.username}</Link>
        {me && <span className="ml-2 font-display text-[10px] font-bold uppercase text-neon-300">You</span>}
        <span className="block font-display text-[11px] uppercase tracking-wider text-slate-500">Lv {levelFor(r.totalPoints).level}</span>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell"><TierBadge tier={tierFor(r.avgFinalScore, r.problemsEvaluated)} /></td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-right text-slate-300 md:table-cell">{plural(r.problemsEvaluated, 'challenge')}</td>
      <td className={cx('px-4 py-3 text-right', hl('solution'))}><ScorePill value={r.avgSolutionScore} /></td>
      <td className={cx('px-4 py-3 text-right', hl('ai'))}><ScorePill value={r.avgAiUsageScore} /></td>
      <td className={cx('px-4 py-3 text-right font-mono font-semibold tabular-nums text-white', hl('xp'))}>{r.totalPoints}</td>
    </tr>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board>('xp');
  const [period, setPeriod] = useState<Period>('all');
  const [category, setCategory] = useState<Category | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    const qs = new URLSearchParams({ board, period, ...(category && { category }), ...(difficulty && { difficulty }) });
    api<LeaderboardResponse>(`/api/leaderboard?${qs}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [board, period, category, difficulty, user?.id]);

  const cfg = BOARDS.find((b) => b.value === board)!;
  const rows = data?.rows ?? [];
  const podium = rows.slice(0, 3);
  const meOffBoard = data?.me && !rows.some((r) => r.userId === data.me!.userId) ? data.me : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader kicker="Season 1" title="Leaderboard" subtitle={cfg.blurb(data?.minForAverage ?? 2)} />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <SegmentedTabs label="Leaderboard" options={BOARDS} value={board} onChange={setBoard} />
        <SegmentedTabs label="Time period" options={PERIODS} value={period} onChange={setPeriod} />
        <div className="flex gap-2 sm:ml-auto">
          <select className={cx(inputClass, 'w-auto')} value={category} onChange={(e) => setCategory(e.target.value as Category | '')} aria-label="Category">
            <option value="">All categories</option>
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <select className={cx(inputClass, 'w-auto')} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | '')} aria-label="Difficulty">
            <option value="">All levels</option>
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
          </select>
        </div>
      </div>

      <ErrorBox message={error} />
      {!data && !error && <Spinner className="mt-12" />}
      <div aria-busy={loading} className={cx('transition-opacity duration-150 ease-out', loading && data && 'opacity-50')}>
      {data && !rows.length && (
        <EmptyState title="Nobody on this board yet">
          {board === 'xp'
            ? 'Scores appear here once reviewers have scored submissions in this period.'
            : `Players qualify after ${data.minForAverage} reviewed challenges in this period.`}
        </EmptyState>
      )}

      {podium.length > 0 && (
        <ol className={cx('mb-8 grid items-start gap-3 sm:gap-4', podium.length === 3 ? 'sm:grid-cols-3' : 'sm:flex sm:justify-center sm:[&>li]:w-80')}>
          {podium.map((r, i) => (
            <li key={r.userId} className={cx(PODIUM[i].order, PODIUM[i].offset)}>
              <Link
                href={`/players/${r.username}`}
                className={cx('press flex items-center gap-4 rounded-xl bg-slate-900/85 p-4 hover:bg-slate-900 sm:block sm:p-5 sm:text-center', PODIUM[i].ring)}
              >
                <span className={cx('chamfer grid h-11 w-11 shrink-0 place-items-center bg-gradient-to-br font-display text-xl font-bold text-slate-950 sm:mx-auto sm:h-12 sm:w-12', PODIUM[i].medal)}>
                  {i === 0 ? <Crown className="h-6 w-6" aria-label="First place" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 sm:block">
                  <span className="block truncate font-semibold text-white sm:mt-3 sm:text-lg">{r.username}</span>
                  <span className="block font-display text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
                    Level {levelFor(r.totalPoints).level} · {plural(r.problemsEvaluated, 'challenge')}
                  </span>
                  <span className="mt-3 hidden justify-center sm:flex"><TierBadge tier={tierFor(r.avgFinalScore, r.problemsEvaluated)} /></span>
                </span>
                <span className="font-mono text-2xl font-semibold tabular-nums text-white sm:mt-3 sm:block sm:text-4xl">
                  {cfg.metric(r)}<span className="ml-1 text-xs text-slate-400 sm:text-sm">{cfg.unit}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 text-left font-display text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="hidden px-4 py-3 sm:table-cell">Tier</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">Reviewed</th>
                <th className={cx('px-4 py-3 text-right', board === 'solution' ? 'text-neon-300' : 'hidden sm:table-cell')}>Solution</th>
                <th className={cx('px-4 py-3 text-right', board === 'ai' ? 'text-neon-300' : 'hidden sm:table-cell')}>AI usage</th>
                <th className={cx('px-4 py-3 text-right', board === 'xp' ? 'text-neon-300' : 'hidden sm:table-cell')}>XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((r) => (
                <Row key={r.userId} r={r} board={board} me={r.userId === user?.id} />
              ))}
              {meOffBoard && (
                <Fragment>
                  <tr aria-hidden><td colSpan={7} className="py-1 pl-4 font-mono text-slate-600 sm:text-center sm:pl-0">⋮</td></tr>
                  <Row r={meOffBoard} board={board} me />
                </Fragment>
              )}
            </tbody>
          </table>
          <p className="border-t border-slate-800 px-4 py-2.5 text-xs text-slate-400">
            Showing {rows.length} of {plural(data!.total, 'ranked player')}.
            {user && !data!.me && (board === 'xp' ? ' You are not ranked in this view yet.' : ` You need ${data!.minForAverage} reviewed challenges in this view to qualify.`)}
          </p>
        </Card>
      )}
      </div>
    </main>
  );
}
