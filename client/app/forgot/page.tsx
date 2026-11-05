'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { Button, Card, ErrorBox, Field, inputClass } from '@/components/ui';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/api/auth/forgot', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex justify-center px-4 py-20">
      <Card className="w-full max-w-sm p-7">
        <p className="font-display text-xs font-semibold text-brand-700">Account recovery</p>
        <h1 className="font-display text-2xl font-bold text-slate-900">Reset password</h1>
        {sent ? (
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <MailCheck className="h-6 w-6 text-brand-700" />
            <p>If an account uses <strong className="text-slate-900">{email}</strong>, a reset link is on its way. It expires in 30 minutes.</p>
            <Link href="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <ErrorBox message={error} />
            <Field label="Email">
              <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </Field>
            <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
            <p className="text-center text-sm text-slate-600">
              Remembered it? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </Card>
    </main>
  );
}
