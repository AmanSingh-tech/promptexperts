'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Button, Card, ErrorBox, Field, inputClass } from '@/components/ui';
import type { User } from '@/lib/types';

export default function RegisterPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', firstName: '', lastName: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: form });
      signIn(res.token, res.user);
      router.push('/problems');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex justify-center px-4 py-16">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold">Create your account</h1>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <ErrorBox message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name"><input className={inputClass} value={form.firstName} onChange={set('firstName')} autoComplete="given-name" /></Field>
            <Field label="Last name"><input className={inputClass} value={form.lastName} onChange={set('lastName')} autoComplete="family-name" /></Field>
          </div>
          <Field label="Username" hint="3–30 letters, digits or underscores">
            <input className={inputClass} value={form.username} onChange={set('username')} autoComplete="username" required pattern="[A-Za-z0-9_]{3,30}" />
          </Field>
          <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></Field>
          <Field label="Password" hint="At least 8 characters">
            <input className={inputClass} type="password" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={8} required />
          </Field>
          <Button type="submit" loading={loading} className="w-full">Create account</Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link href="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
