'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Hourglass } from 'lucide-react';
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {own ? 'Your submission' : `Submission by ${s.user.username}`} · {formatDate(s.submittedAt)}
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            <Link href={`/problems/${s.problem.slug}`} className="hover:underline">{s.problem.title}</Link>
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <DifficultyBadge value={s.problem.difficulty} />
            <StatusBadge value={s.status} />
            {s.problem.type === 'CODE' && <span className="text-sm text-slate-500">{s.passedCount}/{s.totalCount} tests · auto score {s.autoScore}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {isStaff(user) && !own && <LinkButton href={`/review/${s.id}`} variant="secondary">{s.evaluation ? 'Edit review' : 'Review'}</LinkButton>}
          {own && <LinkButton href={`/problems/${s.problem.slug}`}>Try again</LinkButton>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SubmissionTabs submission={s} />
        <div>
          {s.evaluation ? (
            <ScoreCard evaluation={s.evaluation} />
          ) : (
            <Card className="p-5 text-sm">
              <Hourglass className="mb-2 h-5 w-5 text-sky-500" />
              <p className="font-semibold">Waiting for review</p>
              <p className="mt-1 text-slate-500">
                A reviewer will score your AI usage on efficiency, learning, transparency and innovation.
                {s.problem.type === 'CODE'
                  ? ` Your solution score is already set from the tests: ${s.autoScore}/100.`
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
