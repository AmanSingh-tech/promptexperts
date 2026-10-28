'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';
import type { QueueItem } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { Card, DifficultyBadge, EmptyState, ErrorBox, PageHeader, ScorePill, Spinner, StatusBadge, cx } from '@/components/ui';

function Queue() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    api<QueueItem[]>(`/api/evaluations/queue?status=${tab}`).then(setItems).catch((e) => setError(errorMessage(e)));
  }, [tab]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader kicker="Judges' table" title="Review queue" subtitle="Read the transcript, check the answer, and score how well the player used AI." />
      <div className="mb-4 flex gap-2">
        {(['pending', 'reviewed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx('press chamfer-sm px-3 py-1 font-display text-xs font-semibold uppercase tracking-wider', tab === t ? 'bg-neon-400 text-slate-950' : 'bg-slate-800/80 text-slate-300 hover:text-white')}
          >
            {t}
          </button>
        ))}
      </div>
      <ErrorBox message={error} />
      {!items && !error && <Spinner className="mt-12" />}
      {items && !items.length && <EmptyState title={tab === 'pending' ? 'Nothing waiting for review' : 'No reviewed submissions yet'} />}
      {items && items.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 text-left font-display text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Problem</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3 text-right">AI msgs</th>
                <th className="px-4 py-3 text-right">{tab === 'pending' ? 'Auto score' : 'Final'}</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((s) => {
                const own = s.user.id === user?.id;
                return (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      {own ? (
                        <span className="font-medium">{s.problem.title}</span>
                      ) : (
                        <Link href={`/review/${s.id}`} className="font-semibold text-white hover:text-neon-300">{s.problem.title}</Link>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <DifficultyBadge value={s.problem.difficulty} /> {CATEGORY_LABELS[s.problem.category]}
                      </div>
                    </td>
                    <td className="px-4 py-3">{s.user.username}{own && <span className="ml-1 text-xs text-slate-400">(you, cannot review)</span>}</td>
                    <td className="px-4 py-3"><StatusBadge value={s.status} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.aiSession?.totalMessages ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <ScorePill value={tab === 'pending' ? s.autoScore : s.evaluation?.finalScore} />
                      {tab === 'reviewed' && <div className="text-xs text-slate-500">by {s.evaluation?.reviewer.username}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(s.submittedAt)}</td>
                  </tr>
                );
              })}
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
