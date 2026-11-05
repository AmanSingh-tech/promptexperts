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
        <h2 className="font-display text-lg font-bold text-slate-900">Achievements</h2>
        <span className="font-mono text-sm tabular-nums text-slate-600">{earned}/{items.length}</span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <li key={a.key} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2.5">
            <span className={cx('hex grid h-11 w-11 shrink-0 place-items-center', a.earnedAt ? 'bg-amber-400 text-amber-950' : 'bg-slate-200 text-slate-500')}>
              {a.earnedAt ? <AchievementIcon id={a.key} className="h-4 w-4" /> : <Lock className="h-4 w-4" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className={cx('block truncate text-sm font-medium', a.earnedAt ? 'text-slate-900' : 'text-slate-600')}>
                {a.title}
                {!a.earnedAt && <span className="sr-only"> (locked)</span>}
              </span>
              <span className="block text-xs text-slate-600">{a.earnedAt ? `Earned ${formatDate(a.earnedAt)}` : a.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
