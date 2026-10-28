'use client';

import { use, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { ContestDetail } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { ContestForm } from '@/components/ContestForm';
import { ErrorBox, PageHeader, Spinner } from '@/components/ui';

function Edit({ id }: { id: string }) {
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<ContestDetail>(`/api/contests/${id}`).then(setContest).catch((e) => setError(errorMessage(e)));
  }, [id]);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader kicker="Control room" title={contest ? `Edit: ${contest.title}` : 'Edit contest'} />
      <ErrorBox message={error} />
      {!contest && !error && <Spinner />}
      {contest && <ContestForm initial={contest} />}
    </main>
  );
}

export default function EditContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth roles={['ADMIN']}>
      <Edit id={id} />
    </RequireAuth>
  );
}
