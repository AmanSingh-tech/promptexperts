'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/lib/format';
import { levelFor, plural, tierFor } from '@/lib/game';
import type { Board, Category, Difficulty, LeaderboardResponse, LeaderboardRow, Period, Season } from '@/lib/types';
import { Countdown } from '@/components/Countdown';
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
  { value: 'month', label: 'Last 30 days' },
  { value: 'week', label: 'Last 7 days' }
];

// The view is a rolling period or `season:<slug>`.
const seasonView = (s: Season) => `season:${s.slug}`;
const STATE_LABELS: Record<Season['state'], string> = { LIVE: 'is live', UPCOMING: 'starts soon', ENDED: 'has ended' };
const dateOnly = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });

const PODIUM = [
  { ring: '', medal: 'from-amber-200 to-amber-500', offset: 'sm:pt-0', order: 'sm:order-2' },
  { ring: '', medal: 'from-slate-100 to-slate-400', offset: 'sm:pt-8', order: 'sm:order-1' },
  { ring: '', medal: 'from-orange-300 to-orange-600', offset: 'sm:pt-12', order: 'sm:order-3' }
];

const col = (board: Board, b: Board) => (board === b ? 'text-base' : 'hidden opacity-80 sm:table-cell');

function Row({ r, board, me }: { r: LeaderboardRow; board: Board; me: boolean }) {
  const hl = (b: Board) => col(board, b);
  return (
    <tr className={cx(me && 'bg-brand-500/[0.06]')}>
      <td className="px-4 py-3 font-mono font-semibold tabular-nums text-slate-700">#{r.rank}</td>
      <td className="px-4 py-3">
        <Link href={`/players/${r.username}`} className="font-semibold text-slate-900 hover:text-brand-700">{r.username}</Link>
        {me && <span className="ml-2 font-display text-[10px] font-bold text-brand-700">You</span>}
        <span className="block font-display text-[11px] text-slate-500">Lv {levelFor(r.totalPoints).level}</span>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell"><TierBadge tier={tierFor(r.avgFinalScore, r.problemsEvaluated)} /></td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-right text-slate-700 md:table-cell">{plural(r.problemsEvaluated, 'challenge')}</td>
      <td className={cx('px-4 py-3 text-right', hl('solution'))}><ScorePill value={r.avgSolutionScore} /></td>
      <td className={cx('px-4 py-3 text-right', hl('ai'))}><ScorePill value={r.avgAiUsageScore} /></td>
      <td className={cx('px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900', hl('xp'))}>{r.totalPoints}</td>
    </tr>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board>('xp');
  const [view, setView] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [category, setCategory] = useState<Category | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Opens on the live season when there is one.
  useEffect(() => {
    api<Season[]>('/api/seasons')
      .then((s) => {
        setSeasons(s);
        const live = s.find((x) => x.state === 'LIVE');
        setView((v) => v ?? (live ? seasonView(live) : 'all'));
      })
      .catch(() => setView((v) => v ?? 'all'));
  }, []);

  useEffect(() => {
    if (!view) return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    const scope: Record<string, string> = view.startsWith('season:') ? { season: view.slice(7) } : { period: view };
    const qs = new URLSearchParams({ board, ...scope, ...(category && { category }), ...(difficulty && { difficulty }) });
    api<LeaderboardResponse>(`/api/leaderboard?${qs}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [board, view, category, difficulty, user?.id]);

  const cfg = BOARDS.find((b) => b.value === board)!;
  const rows = data?.rows ?? [];
  const podium = rows.slice(0, 3);
  const meOffBoard = data?.me && !rows.some((r) => r.userId === data.me!.userId) ? data.me : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Leaderboard" subtitle={cfg.blurb(data?.minForAverage ?? 2)} />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <SegmentedTabs label="Leaderboard" options={BOARDS} value={board} onChange={setBoard} />
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          <select className={cx(inputClass, 'w-auto')} value={view ?? ''} onChange={(e) => setView(e.target.value)} aria-label="Time period">
            {seasons.filter((s) => s.state !== 'UPCOMING').map((s) => (
              <option key={s.id} value={seasonView(s)}>{s.name}{s.state === 'LIVE' ? ' (live)' : ''}</option>
            ))}
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
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

      {data?.season && (
        <p className="-mt-4 mb-6 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{data.season.name}</span> {STATE_LABELS[data.season.state]} · {dateOnly(data.season.startsAt)} to {dateOnly(data.season.endsAt)}
          {data.season.state === 'LIVE' && <> · ends in <Countdown to={data.season.endsAt} className="font-mono tabular-nums text-slate-900" /></>}
          {data.season.state === 'ENDED' && ' · final standings, still updating if reviews are pending'}
        </p>
      )}
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
                className={cx('press flex items-center gap-4 rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50 sm:block sm:p-5 sm:text-center', PODIUM[i].ring)}
              >
                <span className={cx('grid h-11 w-11 shrink-0 place-items-center bg-gradient-to-br font-display text-xl font-bold text-white sm:mx-auto sm:h-12 sm:w-12', PODIUM[i].medal)}>
                  {i === 0 ? <Crown className="h-6 w-6" aria-label="First place" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 sm:block">
                  <span className="block truncate font-semibold text-slate-900 sm:mt-3 sm:text-lg">{r.username}</span>
                  <span className="block font-display text-[11px] font-semibold text-slate-600 sm:text-xs">
                    Level {levelFor(r.totalPoints).level} · {plural(r.problemsEvaluated, 'challenge')}
                  </span>
                  <span className="mt-3 hidden justify-center sm:flex"><TierBadge tier={tierFor(r.avgFinalScore, r.problemsEvaluated)} /></span>
                </span>
                <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900 sm:mt-3 sm:block sm:text-4xl">
                  {cfg.metric(r)}<span className="ml-1 text-xs text-slate-600 sm:text-sm">{cfg.unit}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left font-display text-[11px] text-slate-600">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="hidden px-4 py-3 sm:table-cell">Tier</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">Reviewed</th>
                <th className={cx('px-4 py-3 text-right', board === 'solution' ? 'text-brand-700' : 'hidden sm:table-cell')}>Solution</th>
                <th className={cx('px-4 py-3 text-right', board === 'ai' ? 'text-brand-700' : 'hidden sm:table-cell')}>AI usage</th>
                <th className={cx('px-4 py-3 text-right', board === 'xp' ? 'text-brand-700' : 'hidden sm:table-cell')}>XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {rows.map((r) => (
                <Row key={r.userId} r={r} board={board} me={r.userId === user?.id} />
              ))}
              {meOffBoard && (
                <Fragment>
                  <tr aria-hidden><td colSpan={7} className="py-1 pl-4 font-mono text-slate-400 sm:text-center sm:pl-0">⋮</td></tr>
                  <Row r={meOffBoard} board={board} me />
                </Fragment>
              )}
            </tbody>
          </table>
          <p className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-600">
            Showing {rows.length} of {plural(data!.total, 'ranked player')}.
            {user && !data!.me && (board === 'xp' ? ' You are not ranked in this view yet.' : ` You need ${data!.minForAverage} reviewed challenges in this view to qualify.`)}
          </p>
        </Card>
      )}
      </div>
    </main>
  );
}
