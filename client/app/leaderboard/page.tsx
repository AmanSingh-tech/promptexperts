'use client';

import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/lib/format';
import { levelFor, plural, tierFor } from '@/lib/game';
import type { Category, Difficulty, LeaderboardRow } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { TierBadge } from '@/components/TierBadge';
import { Card, EmptyState, ErrorBox, PageHeader, ScorePill, Spinner, cx, inputClass } from '@/components/ui';

const PODIUM = [
  { ring: 'shadow-[0_0_0_1px_rgb(252_211_77_/_0.5),0_0_40px_-12px_rgb(252_211_77_/_0.7)]', medal: 'from-amber-200 to-amber-500', height: 'sm:pt-0', order: 'sm:order-2' },
  { ring: 'shadow-[0_0_0_1px_rgb(203_213_225_/_0.35)]', medal: 'from-slate-100 to-slate-400', height: 'sm:pt-8', order: 'sm:order-1' },
  { ring: 'shadow-[0_0_0_1px_rgb(251_146_60_/_0.35)]', medal: 'from-orange-300 to-orange-600', height: 'sm:pt-12', order: 'sm:order-3' }
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');

  useEffect(() => {
    setRows(null);
    const qs = new URLSearchParams({ ...(category && { category }), ...(difficulty && { difficulty }) });
    api<LeaderboardRow[]>(`/api/leaderboard?${qs}`).then(setRows).catch((e) => setError(errorMessage(e)));
  }, [category, difficulty]);

  const podium = rows?.slice(0, 3) ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        kicker="Season 1"
        title="Leaderboard"
        subtitle="XP is the sum of each player's best final score per challenge. Tier reflects average quality."
        actions={
          <>
            <select className={cx(inputClass, 'w-auto')} value={category} onChange={(e) => setCategory(e.target.value as Category | '')} aria-label="Category">
              <option value="">All categories</option>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <select className={cx(inputClass, 'w-auto')} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | '')} aria-label="Difficulty">
              <option value="">All levels</option>
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
            </select>
          </>
        }
      />
      <ErrorBox message={error} />
      {!rows && !error && <Spinner className="mt-12" />}
      {rows && !rows.length && <EmptyState title="No ranked players yet">Scores appear once reviewers have scored submissions.</EmptyState>}

      {podium.length > 0 && (
        <ol className={cx('mb-8 grid items-end gap-4', podium.length === 3 ? 'sm:grid-cols-3' : 'sm:flex sm:justify-center sm:[&>li]:w-80')}>
          {podium.map((r, i) => (
            <li key={r.userId} className={cx(PODIUM[i].order, PODIUM[i].height)}>
              <div className={cx('rounded-xl bg-slate-900/85 p-5 text-center', PODIUM[i].ring)}>
                <span className={cx('chamfer mx-auto grid h-12 w-12 place-items-center bg-gradient-to-br font-display text-xl font-bold text-slate-950', PODIUM[i].medal)}>
                  {i === 0 ? <Crown className="h-6 w-6" aria-label="First place" /> : i + 1}
                </span>
                <p className="mt-3 truncate text-lg font-semibold text-white">{r.username}</p>
                <p className="font-display text-xs font-semibold uppercase tracking-wider text-slate-400">Level {levelFor(r.totalPoints).level}</p>
                <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-white">{r.totalPoints}<span className="ml-1 text-sm text-slate-400">XP</span></p>
                <div className="mt-3 flex justify-center"><TierBadge tier={tierFor(r.avgFinalScore, r.problemsEvaluated)} /></div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {rows && rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 text-left font-display text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3 text-right">Cleared</th>
                <th className="px-4 py-3 text-right">Solution</th>
                <th className="px-4 py-3 text-right">AI usage</th>
                <th className="px-4 py-3 text-right">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((r) => (
                <tr key={r.userId} className={cx(r.userId === user?.id && 'bg-neon-400/[0.06] shadow-[inset_2px_0_0_rgb(63_227_242)]')}>
                  <td className="px-4 py-3 font-mono font-semibold tabular-nums text-slate-300">#{r.rank}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-white">{r.username}</span>
                    {r.userId === user?.id && <span className="ml-2 font-display text-[10px] font-bold uppercase text-neon-300">You</span>}
                    <span className="block font-display text-[11px] uppercase tracking-wider text-slate-500">Lv {levelFor(r.totalPoints).level}</span>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={tierFor(r.avgFinalScore, r.problemsEvaluated)} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-slate-300">{plural(r.problemsEvaluated, 'challenge')}</td>
                  <td className="px-4 py-3 text-right"><ScorePill value={r.avgSolutionScore} /></td>
                  <td className="px-4 py-3 text-right"><ScorePill value={r.avgAiUsageScore} /></td>
                  <td className="px-4 py-3 text-right font-mono text-base font-semibold tabular-nums text-white">{r.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
