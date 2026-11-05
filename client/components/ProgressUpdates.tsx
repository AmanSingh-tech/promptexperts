'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { plural, progressGains } from '@/lib/game';
import type { Progress } from '@/lib/types';
import { AchievementIcon } from './Achievements';
import { AnimatedNumber } from './AnimatedNumber';
import { useAuth } from './AuthProvider';
import { TierBadge } from './TierBadge';
import { Button, LinkButton } from './ui';

const CHECK_EVERY_MS = 60000;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 border-t border-slate-200 py-2.5">
      <span className="font-display text-xs font-semibold text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{children}</span>
    </li>
  );
}

export function ProgressUpdates() {
  const { user, refreshPlayer } = useAuth();
  const pathname = usePathname();
  const [progress, setProgress] = useState<Progress | null>(null);
  const lastCheck = useRef({ userId: '', at: 0 });
  const inWorkspace = pathname.startsWith('/problems/');

  useEffect(() => {
    // Never interrupt someone mid-attempt; the update waits until they leave the workspace.
    if (!user || inWorkspace || progress) return;
    if (lastCheck.current.userId === user.id && Date.now() - lastCheck.current.at < CHECK_EVERY_MS) return;
    lastCheck.current = { userId: user.id, at: Date.now() };
    api<Progress>('/api/me/progress')
      .then((p) => {
        if (progressGains(p).any) setProgress(p);
        else if (p.previous.rank !== p.current.rank || p.previous.totalPoints !== p.current.totalPoints || p.previous.avgFinalScore !== p.current.avgFinalScore) {
          // A drop isn't shown, but the next gain should be measured from here.
          return api('/api/me/progress/seen', { method: 'POST' });
        }
      })
      .catch(() => undefined);
  }, [user, pathname, inWorkspace, progress]);

  const dismiss = () => {
    setProgress(null);
    api('/api/me/progress/seen', { method: 'POST' }).then(refreshPlayer).catch(() => undefined);
  };

  useEffect(() => {
    if (!progress) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!progress) return null;
  const gains = progressGains(progress);
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={dismiss}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-title"
        className="modal-panel max-h-full w-full max-w-md overflow-y-auto rounded-md border border-slate-200 bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <Trophy className="h-8 w-8 text-brand-700" aria-hidden />
        <h2 id="progress-title" className="mt-3 font-display text-2xl font-bold text-slate-900">
          {gains.level ? `Level ${gains.level} reached` : 'New progress'}
        </h2>
        <p className="text-sm text-slate-600">Since your last update.</p>
        {gains.xp > 0 && (
          <p className="mt-4 font-mono text-4xl font-semibold tabular-nums text-brand-700">
            +<AnimatedNumber value={gains.xp} /> <span className="font-display text-lg">XP</span>
          </p>
        )}
        <ul className="mt-4">
          {gains.tier && <Row label="New tier"><TierBadge tier={gains.tier} /></Row>}
          {gains.rank && <Row label="Rank">{gains.rank.from ? `#${gains.rank.from} → #${gains.rank.to}` : `Entered at #${gains.rank.to}`}</Row>}
          {gains.achievements.length > 0 && (
            <li className="border-t border-slate-200 py-2.5">
              <p className="font-display text-xs font-semibold text-slate-600">{plural(gains.achievements.length, 'achievement')} unlocked</p>
              <ul className="mt-2 space-y-2">
                {gains.achievements.map((a) => (
                  <li key={a.key} className="flex items-center gap-3">
                    <span className="hex grid h-9 w-9 shrink-0 place-items-center bg-amber-400 text-amber-950"><AchievementIcon id={a.key} className="h-4 w-4" /></span>
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium text-slate-900">{a.title}</span>
                      <span className="block text-xs text-slate-600">{a.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <span onClick={dismiss}><LinkButton href="/profile" variant="secondary">View profile</LinkButton></span>
          <Button autoFocus onClick={dismiss}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
