'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock3, Hourglass, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/format';
import { plural } from '@/lib/game';
import type { ContestDetail } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { Countdown } from '@/components/Countdown';
import { Markdown } from '@/components/Markdown';
import { Badge, Button, Card, DifficultyBadge, EmptyState, ErrorBox, LinkButton, Spinner, cx, scoreTone } from '@/components/ui';

export default function ContestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, ready } = useAuth();
  const [c, setC] = useState<ContestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const load = useCallback(() => {
    api<ContestDetail>(`/api/contests/${slug}`).then(setC).catch((e) => setError(errorMessage(e)));
  }, [slug]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function join() {
    setJoining(true);
    try {
      await api(`/api/contests/${slug}/join`, { method: 'POST' });
      toast.success("You're in", { description: c?.state === 'LIVE' ? 'Good luck. The clock is running.' : 'Come back when the contest starts.' });
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setJoining(false);
    }
  }

  if (error && !c) return <div className="mx-auto mt-12 max-w-xl px-4"><ErrorBox message={error} /></div>;
  if (!c) return <Spinner className="mt-24" />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-[65ch]">
            <Link href="/contests" className="font-display text-xs font-semibold text-brand-700 hover:text-brand-700">← Contests</Link>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 sm:text-4xl">{c.title}</h1>
            <div className="mt-3"><Markdown>{c.description || ' '}</Markdown></div>
            <p className="mt-3 text-sm text-slate-600">
              {new Date(c.startsAt).toLocaleString()} → {new Date(c.endsAt).toLocaleString()} · {plural(c.entrants, 'player')} · {plural(c.problemCount, 'challenge')}
            </p>
          </div>
          <div className="w-full rounded-md bg-slate-50 p-5 text-center sm:w-64">
            <p className="font-display text-xs font-semibold text-slate-600">
              {c.state === 'LIVE' ? 'Ends in' : c.state === 'UPCOMING' ? 'Starts in' : 'Contest over'}
            </p>
            {c.state === 'ENDED' ? (
              <p className="mt-1 font-mono text-2xl text-slate-700">Final standings</p>
            ) : (
              <Countdown to={c.state === 'LIVE' ? c.endsAt : c.startsAt} onDone={load} className="mt-1 block font-mono text-3xl font-semibold tabular-nums text-slate-900" />
            )}
            <div className="mt-4">
              {c.joined ? (
                <Badge className="border-brand-500/40 bg-brand-500/10 text-brand-700">You&apos;re entered</Badge>
              ) : c.state === 'ENDED' ? null : user ? (
                <Button className="w-full" onClick={join} loading={joining}>Join contest</Button>
              ) : (
                <LinkButton href={`/login?next=/contests/${c.slug}`} className="w-full">Sign in to join</LinkButton>
              )}
            </div>
          </div>
        </div>
      </Card>
      <ErrorBox message={error} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-slate-900">Challenges</h2>
          {c.problems.length ? (
            <ol className="space-y-2">
              {c.problems.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/problems/${p.slug}?contest=${c.slug}`}
                    className="press flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center bg-slate-100 font-display font-bold text-brand-700">{String.fromCharCode(65 + i)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-900">{p.title}</span>
                      <span className="text-xs text-slate-600">{CATEGORY_LABELS[p.category]} · {p.type === 'CODE' ? 'Code' : 'Written'}</span>
                    </span>
                    <DifficultyBadge value={p.difficulty} />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Challenges unlock at the start">
              <Lock className="mx-auto mb-2 h-5 w-5" /> {plural(c.problemCount, 'challenge')} will appear when the clock hits zero.
            </EmptyState>
          )}
          {c.state === 'LIVE' && !c.joined && c.problems.length > 0 && (
            <p className="mt-3 text-xs text-amber-700">Join the contest first, or your runs will count as practice.</p>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
            Standings {c.state === 'LIVE' && <Clock3 className="h-4 w-4 text-brand-700" aria-label="Live" />}
          </h2>
          {!c.standings.length ? (
            <EmptyState title={c.state === 'UPCOMING' ? 'Standings open at the start' : 'No entrants yet'} />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left font-display text-[11px] text-slate-600">
                  <tr>
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Player</th>
                    {c.problems.map((p, i) => (
                      <th key={p.id} className="px-2 py-3 text-center" title={p.title}>{String.fromCharCode(65 + i)}</th>
                    ))}
                    <th className="px-3 py-3 text-right text-brand-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {c.standings.map((r) => (
                    <tr key={r.userId} className={cx(r.userId === user?.id && 'bg-brand-500/[0.06]')}>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{r.rank}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/players/${r.username}`} className="font-semibold text-slate-900 hover:text-brand-700">{r.username}</Link>
                        {r.pending > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-600"><Hourglass className="h-3 w-3" /> {r.pending} in review</span>
                        )}
                      </td>
                      {c.problems.map((p) => {
                        const cell = r.cells[p.id];
                        return (
                          <td key={p.id} className="px-2 py-2.5 text-center font-mono tabular-nums">
                            {cell?.best != null ? (
                              <span className={scoreTone(cell.best)}>{cell.best}</span>
                            ) : cell?.pending ? (
                              <span className="text-slate-500" title="Awaiting review">…</span>
                            ) : (
                              <span className="text-slate-300">–</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-right font-mono text-base font-semibold tabular-nums text-slate-900">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
                Best reviewed score per challenge. Ties go to whoever reached their total first. “…” means awaiting review.
              </p>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
