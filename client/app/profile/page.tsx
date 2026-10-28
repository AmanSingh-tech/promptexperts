'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { MyStats } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { RubricBars } from '@/components/ScoreCard';
import { ScoreTrend } from '@/components/ScoreTrend';
import { Card, EmptyState, ErrorBox, PageHeader, ScorePill, Spinner } from '@/components/ui';

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<MyStats>('/api/me/stats').then(setStats).catch((e) => setError(errorMessage(e)));
  }, []);

  if (!user) return null;
  const weakest =
    stats?.evaluated
      ? (Object.entries(stats.rubric) as [keyof MyStats['rubric'], number][]).sort((a, b) => a[1] - b[1])[0]
      : null;
  const tips: Record<string, string> = {
    aiEfficiency: 'Give the AI context: your current idea, the constraint you are stuck on, and what you want back.',
    aiLearning: 'Ask why an approach works and rewrite suggestions in your own words instead of pasting them.',
    aiTransparency: 'Narrate your reasoning in the chat ("I think…", "I tried…") so reviewers can follow your process.',
    aiInnovation: 'Use AI to generate edge-case tests, compare two approaches, or review your final code.'
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username}
        subtitle={`@${user.username} · ${user.email} · ${user.role.toLowerCase()}`}
      />
      <ErrorBox message={error} />
      {!stats && !error && <Spinner className="mt-12" />}
      {stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Tile label="Avg final" value={stats.evaluated ? <ScorePill value={stats.avgFinalScore} /> : '–'} sub={`${stats.evaluated} reviewed`} />
            <Tile label="Avg AI usage" value={stats.evaluated ? <ScorePill value={stats.avgAiUsageScore} /> : '–'} sub="60% of final" />
            <Tile label="Avg solution" value={stats.evaluated ? <ScorePill value={stats.avgSolutionScore} /> : '–'} sub="40% of final" />
            <Tile label="Submissions" value={stats.submissions} sub={`${stats.problemsAttempted} problems · ${stats.accepted} accepted`} />
          </div>

          {stats.evaluated === 0 ? (
            <EmptyState title="No reviewed submissions yet">
              Your trends and rubric breakdown appear after a reviewer scores your first submission.{' '}
              <Link href="/problems" className="text-brand-600 hover:underline">Solve a problem</Link>
            </EmptyState>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Card className="p-5">
                <h2 className="font-semibold">Scores per reviewed submission</h2>
                <p className="mb-3 text-xs text-slate-500">In submission order. Hover a point for details.</p>
                <ScoreTrend timeline={stats.timeline} />
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-slate-500">Show as table</summary>
                  <table className="mt-2 w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr><th className="py-1">#</th><th>Problem</th><th>Date</th><th className="text-right">Solution</th><th className="text-right">AI usage</th><th className="text-right">Final</th></tr>
                    </thead>
                    <tbody>
                      {stats.timeline.map((t, i) => (
                        <tr key={t.solveId} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-1">{i + 1}</td>
                          <td><Link href={`/submissions/${t.solveId}`} className="hover:underline">{t.problem}</Link></td>
                          <td>{formatDate(t.date)}</td>
                          <td className="text-right tabular-nums">{t.solutionScore}</td>
                          <td className="text-right tabular-nums">{t.aiUsageScore}</td>
                          <td className="text-right tabular-nums">{t.finalScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </Card>
              <Card className="p-5">
                <h2 className="mb-4 font-semibold">AI usage rubric (average)</h2>
                <RubricBars values={stats.rubric} />
                {weakest && (
                  <p className="mt-5 rounded-lg bg-brand-50 p-3 text-sm text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">
                    <strong>Next step:</strong> {tips[weakest[0]]}
                  </p>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  );
}
