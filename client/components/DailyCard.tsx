'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/format';
import { plural } from '@/lib/game';
import type { DailyChallenge } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { DifficultyBadge } from './ui';

function streakText(daily: DailyChallenge) {
  const { streak } = daily;
  if (!streak) return 'Sign in to build a streak.';
  if (!streak.current) return 'Clear today\'s daily or a new challenge to start a streak.';
  const days = `${plural(streak.current, 'day')} streak`;
  return streak.activeToday ? `${days}, safe for today.` : `${days}. Clear today\'s daily or a new challenge to keep it.`;
}

export function DailyCard() {
  const { ready, user } = useAuth();
  const [daily, setDaily] = useState<DailyChallenge | null>(null);

  useEffect(() => {
    if (!ready) return;
    // The Practice page works fine without this card, so a failure just leaves it out.
    api<DailyChallenge>('/api/daily').then(setDaily).catch(() => setDaily(null));
  }, [ready, user]);

  if (!daily?.problem) return null;
  return (
    <Link
      href={`/problems/${daily.problem.slug}`}
      className="press mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-md border border-slate-200 bg-white p-5 hover:bg-slate-50"
    >
      <div className="min-w-0">
        <p className="font-display text-xs font-semibold text-brand-700">Daily challenge</p>
        <h2 className="mt-1 font-display text-xl font-bold leading-tight text-slate-900">{daily.problem.title}</h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <DifficultyBadge value={daily.problem.difficulty} />
          {CATEGORY_LABELS[daily.problem.category]}
        </p>
      </div>
      <div className="text-sm sm:text-right">
        <p className="flex items-center gap-1.5 text-slate-800 sm:justify-end">
          {daily.completed ? <CheckCircle2 className="h-4 w-4 text-brand-700" aria-hidden /> : <Flame className="h-4 w-4 text-amber-700" aria-hidden />}
          {daily.completed ? 'Cleared today' : streakText(daily)}
        </p>
        <p className="mt-1 text-xs text-slate-600">New challenge at 00:00 UTC</p>
      </div>
    </Link>
  );
}
