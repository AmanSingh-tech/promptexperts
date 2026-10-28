'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { levelFor } from '@/lib/game';
import type { LeaderboardResponse, LeaderboardRow, ProblemSummary } from '@/lib/types';
import { cx } from './ui';

export function LiveStats() {
  const [stats, setStats] = useState<{ problems: number; players: number; topScore: number } | null>(null);
  useEffect(() => {
    Promise.all([api<ProblemSummary[]>('/api/problems'), api<LeaderboardResponse>('/api/leaderboard')])
      .then(([p, l]) => setStats({ problems: p.length, players: l.total, topScore: l.rows[0]?.totalPoints ?? 0 }))
      .catch(() => {});
  }, []);
  const items = [
    ['Challenges', stats?.problems],
    ['Ranked players', stats?.players],
    ['Top score', stats?.topScore],
    ['Score from AI usage', '60%']
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-800/60 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="bg-slate-950/80 px-4 py-4 text-center">
          <dd className="font-mono text-2xl font-semibold tabular-nums text-white">{value ?? '–'}</dd>
          <dt className="mt-1 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

const PODIUM = ['from-amber-300 to-amber-500', 'from-slate-200 to-slate-400', 'from-orange-300 to-orange-600'];

export function TopPlayers() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  useEffect(() => {
    api<LeaderboardResponse>('/api/leaderboard').then((r) => setRows(r.rows.slice(0, 3))).catch(() => setRows([]));
  }, []);
  if (!rows) return <div className="h-32" />;
  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
        No ranked players yet. <Link href="/problems" className="text-neon-300 hover:underline">Be the first.</Link>
      </p>
    );
  }
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {rows.map((r, i) => (
        <li key={r.userId} className="hud rounded-xl bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgb(160_166_196_/_0.12)]">
          <div className="flex items-center gap-3">
            <span className={cx('chamfer-sm grid h-10 w-10 place-items-center bg-gradient-to-br font-display text-lg font-bold text-slate-950', PODIUM[i])}>
              {i === 0 ? <Crown className="h-5 w-5" /> : i + 1}
            </span>
            <div className="min-w-0">
              <Link href={`/players/${r.username}`} className="block truncate font-semibold text-white hover:text-neon-300">{r.username}</Link>
              <p className="font-display text-xs uppercase tracking-wider text-slate-400">Level {levelFor(r.totalPoints).level}</p>
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-semibold tabular-nums text-white">{r.totalPoints}<span className="ml-1 text-sm text-slate-400">XP</span></p>
          <p className="mt-1 text-xs text-slate-400">AI usage avg <span className="font-mono text-neon-300">{r.avgAiUsageScore}</span></p>
        </li>
      ))}
    </ol>
  );
}
