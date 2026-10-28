'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Button, Card, ErrorBox, Field, inputClass } from '@/components/ui';
import type { User } from '@/lib/types';

function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: { username, password } });
      signIn(res.token, res.user);
      router.push(next?.startsWith('/') ? next : '/problems');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <ErrorBox message={error} />
        <Field label="Username or email">
          <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </Field>
        <Field label="Password">
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Button type="submit" loading={loading} className="w-full">Sign in</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        New here? <Link href="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex justify-center px-4 py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
