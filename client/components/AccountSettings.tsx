'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { Button, Card, ErrorBox, Field, inputClass } from './ui';

export function AccountSettings() {
  const { signIn, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ user: User }>('/api/auth/password', { method: 'PATCH', body: { currentPassword: current, newPassword: next } });
      signIn(res.user);
      setCurrent('');
      setNext('');
      toast.success('Password changed', { description: 'Your other devices were signed out.' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function logoutEverywhere() {
    if (!window.confirm('Sign out on every device, including this one?')) return;
    await api('/api/auth/logout-everywhere', { method: 'POST' }).catch(() => {});
    await signOut('/login');
  }

  return (
    <Card className="mt-6 p-5">
      <h2 className="font-display text-lg font-bold text-slate-900">Account security</h2>
      <form onSubmit={changePassword} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Current password">
          <input className={inputClass} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Field label="New password">
          <input className={inputClass} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} required />
        </Field>
        <Button type="submit" loading={saving}>Change password</Button>
      </form>
      <div className="mt-3"><ErrorBox message={error} /></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
        <span>Lost a device? Sign out of every session at once.</span>
        <Button variant="secondary" size="sm" onClick={logoutEverywhere}>Sign out everywhere</Button>
      </div>
    </Card>
  );
}
