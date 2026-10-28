'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Hourglass, RotateCcw } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Submission } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth, isStaff } from '@/components/AuthProvider';
import { ScoreCard } from '@/components/ScoreCard';
import { SubmissionTabs } from '@/components/SubmissionView';
import { Card, DifficultyBadge, ErrorBox, LinkButton, Spinner, StatusBadge } from '@/components/ui';

function SubmissionDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [s, setS] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Submission>(`/api/submissions/${id}`).then(setS).catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error) return <div className="mx-auto mt-12 max-w-xl px-4"><ErrorBox message={error} /></div>;
  if (!s) return <Spinner className="mt-24" />;

  const own = s.user.id === user?.id;
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-neon-400">
            {own ? 'Your run' : `Run by ${s.user.username}`} · {formatDate(s.submittedAt)}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold uppercase text-white">
            <Link href={`/problems/${s.problem.slug}`} className="hover:text-neon-300">{s.problem.title}</Link>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DifficultyBadge value={s.problem.difficulty} />
            <StatusBadge value={s.status} />
            {s.problem.type === 'CODE' && (
              <span className="font-mono text-sm text-slate-400">{s.passedCount}/{s.totalCount} tests · auto score {s.autoScore}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isStaff(user) && !own && <LinkButton href={`/review/${s.id}`} variant="secondary">{s.evaluation ? 'Edit review' : 'Review'}</LinkButton>}
          {own && <LinkButton href={`/problems/${s.problem.slug}`}><RotateCcw className="h-4 w-4" /> Rematch</LinkButton>}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <SubmissionTabs submission={s} />
        <div>
          {s.evaluation ? (
            <ScoreCard evaluation={s.evaluation} />
          ) : (
            <Card hud className="p-5 text-sm">
              <Hourglass className="mb-3 h-6 w-6 text-neon-400" />
              <p className="font-display text-lg font-bold uppercase text-white">Awaiting review</p>
              <p className="mt-2 text-slate-400">
                A reviewer will score your AI usage on efficiency, learning, transparency and innovation.
                {s.problem.type === 'CODE'
                  ? ` Your solution score is already locked in from the tests: ${s.autoScore}/100.`
                  : ' They will also grade your written answer.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <SubmissionDetail id={id} />
    </RequireAuth>
  );
}
