'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';
import type { QueueResponse } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Badge, Card, DifficultyBadge, EmptyState, ErrorBox, LinkButton, PageHeader, ScorePill, Spinner, StatusBadge } from '@/components/ui';

type Tab = 'todo' | 'disputed' | 'final';
const TABS: { value: Tab; label: string }[] = [
  { value: 'todo', label: 'To review' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'final', label: 'Final' }
];
const EMPTY: Record<Tab, string> = {
  todo: 'Nothing waiting for your review',
  disputed: 'No disputed results',
  final: 'No final results yet'
};

function Queue() {
  const [tab, setTab] = useState<Tab>('todo');
  const [data, setData] = useState<QueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    api<QueueResponse>(`/api/evaluations/queue?status=${tab}`).then(setData).catch((e) => setError(errorMessage(e)));
  }, [tab]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
       
        title="Review queue"
        subtitle={
          data && data.requiredReviews > 1
            ? `Each submission needs ${data.requiredReviews} independent reviews. Other reviewers' scores stay hidden until you submit yours.`
            : 'Read the transcript and code history, check the answer, and score how well the player used AI.'
        }
        actions={<LinkButton href="/review/guide" variant="secondary"><BookOpen className="h-4 w-4" /> Rubric guide</LinkButton>}
      />
      <div className="mb-5">
        <SegmentedTabs label="Queue" options={TABS} value={tab} onChange={setTab} />
      </div>
      <ErrorBox message={error} />
      {!data && !error && <Spinner className="mt-12" />}
      {data && !data.items.length && <EmptyState title={EMPTY[tab]} />}
      {data && data.items.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left font-display text-[11px] text-slate-600">
              <tr>
                <th className="px-4 py-3">Challenge</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3 text-right">Reviews</th>
                <th className="px-4 py-3 text-right">AI msgs</th>
                <th className="px-4 py-3 text-right">{tab === 'todo' ? 'Auto score' : 'Final'}</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {data.items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/review/${s.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{s.problem.title}</Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                      <DifficultyBadge value={s.problem.difficulty} /> {CATEGORY_LABELS[s.problem.category]}
                    </div>
                  </td>
                  <td className="px-4 py-3">{s.user.username}</td>
                  <td className="px-4 py-3"><StatusBadge value={s.status} /></td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {s.reviewCount}/{data.requiredReviews}
                    {s.reviewedByMe && <Badge className="ml-2 border-brand-500/30 bg-brand-500/10 text-brand-700">Yours</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{s.aiSession?.totalMessages ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <ScorePill value={tab === 'todo' ? s.autoScore : s.evaluation?.finalScore} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(s.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}

export default function ReviewPage() {
  return (
    <RequireAuth roles={['REVIEWER', 'ADMIN']}>
      <Queue />
    </RequireAuth>
  );
}
