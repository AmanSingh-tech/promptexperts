'use client';

import { useEffect, useState } from 'react';
import { Medal } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/lib/format';
import type { Category, Difficulty, LeaderboardRow } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { Card, EmptyState, ErrorBox, PageHeader, ScorePill, Spinner, cx, inputClass } from '@/components/ui';

const MEDAL = ['text-amber-500', 'text-slate-400', 'text-orange-700'];

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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Leaderboard"
        subtitle="Points are the sum of each person's best final score per problem (40% solution + 60% AI usage)."
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
      {rows && !rows.length && <EmptyState title="No reviewed submissions yet">Scores appear once reviewers have scored submissions.</EmptyState>}
      {rows && rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3 text-right">Problems</th>
                <th className="px-4 py-3 text-right">Avg solution</th>
                <th className="px-4 py-3 text-right">Avg AI usage</th>
                <th className="px-4 py-3 text-right">Avg final</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.userId} className={cx(r.userId === user?.id && 'bg-brand-50/60 dark:bg-brand-900/20')}>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      {r.rank <= 3 && <Medal className={cx('h-4 w-4', MEDAL[r.rank - 1])} aria-hidden />}
                      {r.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{r.username}{r.userId === user?.id && <span className="ml-1 text-xs text-brand-600">(you)</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.problemsEvaluated}</td>
                  <td className="px-4 py-3 text-right"><ScorePill value={r.avgSolutionScore} /></td>
                  <td className="px-4 py-3 text-right"><ScorePill value={r.avgAiUsageScore} /></td>
                  <td className="px-4 py-3 text-right"><ScorePill value={r.avgFinalScore} /></td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{r.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
