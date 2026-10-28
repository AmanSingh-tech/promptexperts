'use client';

import { RequireAuth } from '@/components/RequireAuth';
import { ProblemForm } from '@/components/ProblemForm';
import { PageHeader } from '@/components/ui';

export default function NewProblemPage() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader kicker="Control room" title="New challenge" />
        <ProblemForm />
      </main>
    </RequireAuth>
  );
}
