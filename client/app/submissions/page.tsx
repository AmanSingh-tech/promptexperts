'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { SubmissionSummary } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { Card, EmptyState, ErrorBox, PageHeader, ScorePill, Spinner, StatusBadge } from '@/components/ui';

function Submissions() {
  const [items, setItems] = useState<SubmissionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SubmissionSummary[]>('/api/submissions/mine').then(setItems).catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="My submissions" subtitle="Each submission is one attempt: your answer plus the AI conversation behind it." />
      <ErrorBox message={error} />
      {!items && !error && <Spinner className="mt-12" />}
      {items && !items.length && (
        <EmptyState title="No submissions yet">
          <Link href="/problems" className="text-brand-600 hover:underline">Pick a problem to start</Link>
        </EmptyState>
      )}
      {items && items.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Problem</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3 text-right">AI msgs</th>
                <th className="px-4 py-3 text-right">Solution</th>
                <th className="px-4 py-3 text-right">AI usage</th>
                <th className="px-4 py-3 text-right">Final</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <Link href={`/submissions/${s.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">{s.problem.title}</Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={s.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.aiSession?.totalMessages ?? 0}</td>
                  <td className="px-4 py-3 text-right"><ScorePill value={s.evaluation?.solutionScore ?? s.autoScore} /></td>
                  <td className="px-4 py-3 text-right"><ScorePill value={s.evaluation?.aiUsageScore} /></td>
                  <td className="px-4 py-3 text-right">
                    {s.evaluation ? <ScorePill value={s.evaluation.finalScore} /> : <span className="text-xs text-slate-500">In review</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(s.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}

export default function SubmissionsPage() {
  return (
    <RequireAuth>
      <Submissions />
    </RequireAuth>
  );
}
