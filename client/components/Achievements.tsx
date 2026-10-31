import { CalendarCheck, Compass, Flag, Flame, Lock, Medal, Mountain, Sparkles, Target, Trophy, type LucideIcon } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { Achievement } from '@/lib/types';
import { Card, cx } from './ui';

const ICONS: Record<string, LucideIcon> = {
  'first-run': Flag,
  veteran: Medal,
  'prompt-master': Sparkles,
  flawless: Target,
  'hard-mode': Mountain,
  'all-rounder': Compass,
  'streak-3': Flame,
  'streak-7': Flame,
  'daily-5': CalendarCheck,
  podium: Trophy
};

export function AchievementIcon({ id, className }: { id: string; className?: string }) {
  const Icon = ICONS[id] ?? Medal;
  return <Icon className={className} aria-hidden />;
}

export function Achievements({ items }: { items: Achievement[] }) {
  const earned = items.filter((a) => a.earnedAt).length;
  return (
    <Card className="mt-6 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold uppercase text-white">Achievements</h2>
        <span className="font-mono text-sm tabular-nums text-slate-400">{earned}/{items.length}</span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <li key={a.key} className="flex items-center gap-3 rounded-lg bg-slate-950/60 px-3 py-2.5">
            <span className={cx('chamfer-sm grid h-9 w-9 shrink-0 place-items-center', a.earnedAt ? 'bg-xp-400/15 text-xp-300' : 'bg-slate-800 text-slate-500')}>
              {a.earnedAt ? <AchievementIcon id={a.key} className="h-4 w-4" /> : <Lock className="h-4 w-4" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className={cx('block truncate text-sm font-medium', a.earnedAt ? 'text-slate-100' : 'text-slate-400')}>
                {a.title}
                {!a.earnedAt && <span className="sr-only"> (locked)</span>}
              </span>
              <span className="block text-xs text-slate-400">{a.earnedAt ? `Earned ${formatDate(a.earnedAt)}` : a.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
