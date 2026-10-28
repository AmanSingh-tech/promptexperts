'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';
import type { ContestSummary, ProblemSummary, Role, User } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Card, DifficultyBadge, ErrorBox, LinkButton, PageHeader, Spinner, cx } from '@/components/ui';

interface Overview { users: number; problems: number; submissions: number; pendingReviews: number; sessions: number; inputTokens: number; outputTokens: number }
type AdminUser = User & { createdAt: string; submissions: number; reviews: number };

function Admin() {
  const { user: me } = useAuth();
  const initialTab = useSearchParams().get('tab');
  const [tab, setTab] = useState<'problems' | 'contests' | 'users'>(initialTab === 'contests' || initialTab === 'users' ? initialTab : 'problems');
  const [contests, setContests] = useState<ContestSummary[] | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Overview>('/api/admin/overview'),
      api<ProblemSummary[]>('/api/problems'),
      api<AdminUser[]>('/api/admin/users'),
      api<ContestSummary[]>('/api/contests')
    ])
      .then(([o, p, u, c]) => {
        setOverview(o);
        setProblems(p);
        setUsers(u);
        setContests(c);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  async function remove(p: ProblemSummary) {
    if (!window.confirm(`Delete "${p.title}"? Its submissions, AI transcripts and reviews are deleted too. This cannot be undone.`)) return;
    try {
      await api(`/api/problems/${p.id}`, { method: 'DELETE' });
      setProblems((ps) => ps?.filter((x) => x.id !== p.id) ?? null);
      toast.success(`Deleted “${p.title}”`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function removeContest(c: ContestSummary) {
    if (!window.confirm(`Delete the contest "${c.title}"? Submissions are kept but no longer linked to it.`)) return;
    try {
      await api(`/api/contests/${c.id}`, { method: 'DELETE' });
      setContests((cs) => cs?.filter((x) => x.id !== c.id) ?? null);
      toast.success(`Deleted “${c.title}”`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function resetLink(u: AdminUser) {
    try {
      const { link, expiresInMinutes } = await api<{ link: string; expiresInMinutes: number }>(`/api/auth/admin/reset-link/${u.id}`, { method: 'POST' });
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success(`Reset link for ${u.username} copied`, { description: `Valid once, for ${expiresInMinutes} minutes. ${link}`, duration: 15000 });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function setRole(u: AdminUser, role: Role) {
    try {
      const updated = await api<User>(`/api/admin/users/${u.id}/role`, { method: 'PATCH', body: { role } });
      setUsers((us) => us?.map((x) => (x.id === u.id ? { ...x, role: updated.role } : x)) ?? null);
      toast.success(`${u.username} is now ${updated.role.toLowerCase()}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        kicker="Control room"
        title="Admin"
        actions={
          <>
            <LinkButton href="/admin/contests/new" variant="secondary"><Plus className="h-4 w-4" /> New contest</LinkButton>
            <LinkButton href="/admin/problems/new"><Plus className="h-4 w-4" /> New problem</LinkButton>
          </>
        }
      />
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
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k}</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">{v}</p>
            </Card>
          ))}
        </div>
      )}
      <div className="mb-4 flex gap-2">
        {(['problems', 'contests', 'users'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('press chamfer-sm px-3 py-1 font-display text-xs font-semibold uppercase tracking-wider', tab === t ? 'bg-neon-400 text-slate-950' : 'bg-slate-800/80 text-slate-300 hover:text-white')}>
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
      {tab === 'contests' && contests && (
        <Card className="divide-y divide-slate-800">
          {!contests.length && <p className="px-4 py-6 text-sm text-slate-400">No contests yet.</p>}
          {contests.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  <Link href={`/contests/${c.slug}`} className="hover:underline">{c.title}</Link>
                  {!c.published && <Badge className="ml-2 border-slate-600 bg-slate-800 text-slate-300">Draft</Badge>}
                </p>
                <p className="text-xs text-slate-400">
                  {c.state.toLowerCase()} · {new Date(c.startsAt).toLocaleString()} → {new Date(c.endsAt).toLocaleString()} · {c.problemCount} challenges · {c.entrants} players
                </p>
              </div>
              <Link href={`/admin/contests/${c.id}`} aria-label={`Edit ${c.title}`} className="rounded p-1.5 text-slate-400 hover:bg-slate-800"><Pencil className="h-4 w-4" /></Link>
              <button onClick={() => removeContest(c)} aria-label={`Delete ${c.title}`} className="rounded p-1.5 text-slate-400 hover:bg-rose-950/40 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </Card>
      )}
      {tab === 'users' && users && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 text-left font-display text-[11px] uppercase tracking-wider text-slate-400">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Submissions</th><th className="px-4 py-3 text-right">Reviews</th><th className="px-4 py-3">Role</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
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
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-base text-slate-100 disabled:opacity-60 sm:text-sm"
                    >
                      <option value="USER">User</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => resetLink(u)} className="press inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-display text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 hover:text-white">
                      <KeyRound className="h-3.5 w-3.5" /> Reset link
                    </button>
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
      <Suspense fallback={<Spinner className="mt-24" />}>
        <Admin />
      </Suspense>
    </RequireAuth>
  );
}
