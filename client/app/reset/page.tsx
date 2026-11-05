'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Button, Card, ErrorBox, Field, inputClass } from '@/components/ui';
import type { User } from '@/lib/types';

function ResetForm() {
  const token = useSearchParams().get('token');
  const router = useRouter();
  const { signIn } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ user: User }>('/api/auth/reset', { method: 'POST', body: { token, password } });
      signIn(res.user);
      toast.success('Password updated', { description: 'You are signed in. Other sessions were signed out.' });
      router.push('/problems');
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm p-7 text-sm text-slate-700">
        This reset link is incomplete. <Link href="/forgot" className="font-semibold text-brand-700 hover:underline">Request a new one</Link>.
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm p-7">
      <p className="font-display text-xs font-semibold text-brand-700">Account recovery</p>
      <h1 className="font-display text-2xl font-bold text-slate-900">Choose a new password</h1>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <ErrorBox message={error} />
        <Field label="New password" hint="At least 8 characters">
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm password">
          <input className={inputClass} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required />
        </Field>
        <Button type="submit" loading={loading} className="w-full">Update password</Button>
      </form>
    </Card>
  );
}

export default function ResetPage() {
  return (
    <main className="flex justify-center px-4 py-20">
      <Suspense>
        <ResetForm />
      </Suspense>
    </main>
  );
}
