'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';
import type { ProblemSummary, Role, User } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Card, DifficultyBadge, ErrorBox, LinkButton, PageHeader, Spinner, cx } from '@/components/ui';

interface Overview { users: number; problems: number; submissions: number; pendingReviews: number; sessions: number; inputTokens: number; outputTokens: number }
type AdminUser = User & { createdAt: string; submissions: number; reviews: number };

function Admin() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<'problems' | 'users'>('problems');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Overview>('/api/admin/overview'), api<ProblemSummary[]>('/api/problems'), api<AdminUser[]>('/api/admin/users')])
      .then(([o, p, u]) => {
        setOverview(o);
        setProblems(p);
        setUsers(u);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  async function remove(p: ProblemSummary) {
    if (!window.confirm(`Delete "${p.title}"? Its submissions, AI transcripts and reviews are deleted too. This cannot be undone.`)) return;
    try {
      await api(`/api/problems/${p.id}`, { method: 'DELETE' });
      setProblems((ps) => ps?.filter((x) => x.id !== p.id) ?? null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function setRole(u: AdminUser, role: Role) {
    try {
      const updated = await api<User>(`/api/admin/users/${u.id}/role`, { method: 'PATCH', body: { role } });
      setUsers((us) => us?.map((x) => (x.id === u.id ? { ...x, role: updated.role } : x)) ?? null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Admin" actions={<LinkButton href="/admin/problems/new"><Plus className="h-4 w-4" /> New problem</LinkButton>} />
      <ErrorBox message={error} />
      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['Users', overview.users],
            ['Problems', overview.problems],
            ['Submissions', overview.submissions],
            ['Awaiting review', overview.pendingReviews],
            ['Claude tokens', (overview.inputTokens + overview.outputTokens).toLocaleString()]
          ].map(([k, v]) => (
            <Card key={k as string} className="p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{k}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{v}</p>
            </Card>
          ))}
        </div>
      )}
      <div className="mb-4 flex gap-2">
        {(['problems', 'users'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('rounded-full px-3 py-1 text-sm capitalize', tab === t ? 'bg-brand-600 text-white' : 'border border-slate-300 dark:border-slate-700')}>
            {t}
          </button>
        ))}
      </div>
      {!problems && !error && <Spinner />}
      {tab === 'problems' && problems && (
        <Card className="divide-y divide-slate-100 dark:divide-slate-800">
          {problems.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  <Link href={`/problems/${p.slug}`} className="hover:underline">{p.title}</Link>
                  {!p.published && <Badge className="ml-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">Draft</Badge>}
                </p>
                <p className="text-xs text-slate-500">{p.type === 'CODE' ? 'Code' : 'Written'} · {CATEGORY_LABELS[p.category]} · {p.submissions} submissions</p>
              </div>
              <DifficultyBadge value={p.difficulty} />
              <Link href={`/admin/problems/${p.id}`} aria-label={`Edit ${p.title}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></Link>
              <button onClick={() => remove(p)} aria-label={`Delete ${p.title}`} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </Card>
      )}
      {tab === 'users' && users && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Submissions</th><th className="px-4 py-3 text-right">Reviews</th><th className="px-4 py-3">Role</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><p className="font-medium">{u.username}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.submissions}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.reviews}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(e) => setRole(u, e.target.value as Role)}
                      aria-label={`Role for ${u.username}`}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800"
                    >
                      <option value="USER">User</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <Admin />
    </RequireAuth>
  );
}
