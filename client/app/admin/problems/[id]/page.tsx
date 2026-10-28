'use client';

import { use, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { Problem } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { ProblemForm } from '@/components/ProblemForm';
import { ErrorBox, PageHeader, Spinner } from '@/components/ui';

function Edit({ id }: { id: string }) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Problem>(`/api/problems/${id}`).then(setProblem).catch((e) => setError(errorMessage(e)));
  }, [id]);
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title={problem ? `Edit: ${problem.title}` : 'Edit problem'} />
      <ErrorBox message={error} />
      {!problem && !error && <Spinner />}
      {problem && <ProblemForm initial={problem} />}
    </main>
  );
}

export default function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth roles={['ADMIN']}>
      <Edit id={id} />
    </RequireAuth>
  );
}
