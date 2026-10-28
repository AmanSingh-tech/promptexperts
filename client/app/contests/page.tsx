'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Swords, Users } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { plural } from '@/lib/game';
import type { ContestState, ContestSummary } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { Countdown } from '@/components/Countdown';
import { Badge, EmptyState, ErrorBox, PageHeader, Spinner, cx } from '@/components/ui';

const STATE_BADGE: Record<ContestState, string> = {
  LIVE: 'border-xp-400/40 bg-xp-400/10 text-xp-300',
  UPCOMING: 'border-neon-400/40 bg-neon-400/10 text-neon-300',
  ENDED: 'border-slate-600 bg-slate-800/60 text-slate-400'
};
const SECTIONS: { state: ContestState; title: string }[] = [
  { state: 'LIVE', title: 'Live now' },
  { state: 'UPCOMING', title: 'Upcoming' },
  { state: 'ENDED', title: 'Past contests' }
];

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function ContestsPage() {
  const { ready } = useAuth();
  const [contests, setContests] = useState<ContestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) api<ContestSummary[]>('/api/contests').then(setContests).catch((e) => setError(errorMessage(e)));
  }, [ready]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        kicker="Timed events"
        title="Contests"
        subtitle="Join before the end, solve the set while the clock runs, and get ranked on reviewed scores: 40% solution, 60% AI usage."
      />
      <ErrorBox message={error} />
      {!contests && !error && <Spinner className="mt-12" />}
      {contests && !contests.length && <EmptyState title="No contests scheduled yet">Check back soon.</EmptyState>}
      {contests &&
        SECTIONS.map(({ state, title }) => {
          const items = contests.filter((c) => c.state === state);
          if (!items.length) return null;
          return (
            <section key={state} className="mb-10">
              <h2 className="mb-4 font-display text-lg font-bold uppercase text-white">{title}</h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {items.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/contests/${c.slug}`}
                      className={cx(
                        'press flex h-full flex-col rounded-xl bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgb(160_166_196_/_0.12)] hover:bg-slate-900',
                        c.state === 'LIVE' && 'hud shadow-[0_0_0_1px_rgb(189_240_67_/_0.35),0_0_32px_-14px_rgb(189_240_67_/_0.6)]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Badge className={STATE_BADGE[c.state]}>
                          {c.state === 'LIVE' && <span className="h-1.5 w-1.5 rounded-full bg-xp-400" aria-hidden />}
                          {c.state.toLowerCase()}
                        </Badge>
                        {c.joined && <Badge className="border-brand-400/40 bg-brand-500/10 text-brand-200">Joined</Badge>}
                        {!c.published && <Badge className="border-slate-600 bg-slate-800 text-slate-300">Draft</Badge>}
                      </div>
                      <h3 className="mt-3 font-display text-xl font-bold uppercase text-white">{c.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">{c.description.replace(/[*_`#>[\]]/g, '')}</p>
                      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 pt-4 text-sm text-slate-300">
                        {c.state === 'ENDED' ? (
                          <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-slate-500" /> Ended {when(c.endsAt)}</span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <CalendarClock className="h-4 w-4 text-slate-500" /> {c.state === 'LIVE' ? 'Ends in' : 'Starts in'}{' '}
                            <Countdown to={c.state === 'LIVE' ? c.endsAt : c.startsAt} className="font-mono tabular-nums text-white" />
                          </span>
                        )}
                        <span className="flex items-center gap-1.5"><Swords className="h-4 w-4 text-slate-500" /> {plural(c.problemCount, 'challenge')}</span>
                        <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-slate-500" /> {plural(c.entrants, 'player')}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
    </main>
  );
}
