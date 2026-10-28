'use client';

import { RequireAuth } from '@/components/RequireAuth';
import { ContestForm } from '@/components/ContestForm';
import { PageHeader } from '@/components/ui';

export default function NewContestPage() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <PageHeader kicker="Control room" title="New contest" />
        <ContestForm />
      </main>
    </RequireAuth>
  );
}
