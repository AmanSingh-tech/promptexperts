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
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-slate-100 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="bg-slate-50 px-4 py-4 text-center">
          <dd className="font-mono text-2xl font-semibold tabular-nums text-slate-900">{value ?? '–'}</dd>
          <dt className="mt-1 font-display text-[11px] font-semibold text-slate-600">{label}</dt>
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
      <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
        No ranked players yet. <Link href="/problems" className="text-brand-700 hover:underline">Be the first.</Link>
      </p>
    );
  }
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {rows.map((r, i) => (
        <li key={r.userId} className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className={cx('grid h-10 w-10 place-items-center bg-gradient-to-br font-display text-lg font-bold text-white', PODIUM[i])}>
              {i === 0 ? <Crown className="h-5 w-5" /> : i + 1}
            </span>
            <div className="min-w-0">
              <Link href={`/players/${r.username}`} className="block truncate font-semibold text-slate-900 hover:text-brand-700">{r.username}</Link>
              <p className="font-display text-xs text-slate-600">Level {levelFor(r.totalPoints).level}</p>
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-semibold tabular-nums text-slate-900">{r.totalPoints}<span className="ml-1 text-sm text-slate-600">XP</span></p>
          <p className="mt-1 text-xs text-slate-600">AI usage avg <span className="font-mono text-brand-700">{r.avgAiUsageScore}</span></p>
        </li>
      ))}
    </ol>
  );
}
