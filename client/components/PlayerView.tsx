'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { levelFor, plural, tierFor } from '@/lib/game';
import type { MyStats } from '@/lib/types';
import { AnimatedNumber } from './AnimatedNumber';
import { RubricBars } from './ScoreCard';
import { ScoreTrend } from './ScoreTrend';
import { TierBadge } from './TierBadge';
import { XpBar } from './XpBar';
import { Card, DifficultyBadge, EmptyState, LinkButton, ScorePill, cx, scoreTone } from './ui';

const TIPS: Record<string, string> = {
  aiEfficiency: 'Give the AI context: your current idea, the constraint you are stuck on, and what you want back.',
  aiLearning: 'Ask why an approach works and rewrite suggestions in your own words instead of pasting them.',
  aiTransparency: 'Narrate your reasoning in the chat ("I think…", "I tried…") so reviewers can follow your process.',
  aiInnovation: 'Use AI to generate edge-case tests, compare two approaches, or review your final code.'
};

function Stat({ label, value, sub, tone }: { label: string; value: number | null; sub: string; tone?: boolean }) {
  return (
    <Card className="p-4">
      <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cx('mt-1 font-mono text-3xl font-semibold tabular-nums', tone && value != null ? scoreTone(value) : 'text-white')}>
        {value == null ? '–' : <AnimatedNumber value={value} />}
      </p>
      <p className="text-xs text-slate-400">{sub}</p>
    </Card>
  );
}

export function PlayerView({
  name,
  username,
  subtitle,
  stats,
  own
}: {
  name: string;
  username: string;
  subtitle: string;
  stats: MyStats;
  own: boolean;
}) {
  const { level, into, toNext, progress } = levelFor(stats.totalPoints);
  const tier = tierFor(stats.avgFinalScore, stats.evaluated);
  const weakest = own && stats.evaluated ? (Object.entries(stats.rubric) as [string, number][]).sort((a, b) => a[1] - b[1])[0] : null;

  return (
    <>
      <Card hud className="relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="chamfer grid h-24 w-24 shrink-0 place-items-center bg-gradient-to-br from-brand-500 to-neon-500 font-display text-4xl font-bold uppercase text-slate-950">
            {username[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-neon-400">{own ? 'Your player card' : 'Player card'}</p>
            <h1 className="truncate font-display text-3xl font-bold uppercase text-white">{name}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TierBadge tier={tier} />
              {stats.rank && <Link href="/leaderboard" className="font-mono text-sm text-slate-300 hover:text-neon-300">Rank #{stats.rank}</Link>}
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-sm font-bold uppercase tracking-wider text-white">Level {level}</span>
              <span className="font-mono text-xs tabular-nums text-slate-400">{into}/100 XP</span>
            </div>
            <XpBar progress={progress} className="mt-2 h-2.5" />
            <p className="mt-1.5 text-xs text-slate-400">{toNext} XP to level {level + 1}</p>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total XP" value={stats.totalPoints} sub={plural(stats.evaluated, 'reviewed run')} />
        <Stat label="Avg final" value={stats.evaluated ? stats.avgFinalScore : null} sub="Tier is based on this" tone />
        <Stat label="Avg AI usage" value={stats.evaluated ? stats.avgAiUsageScore : null} sub="60% of each score" tone />
        <Stat label="Cleared" value={stats.cleared.length} sub={`${plural(stats.problemsAttempted, 'challenge')} attempted`} />
      </div>

      {stats.evaluated === 0 ? (
        <div className="mt-6">
          <EmptyState title="No reviewed runs yet">
            {own ? 'Your trends and skill stats appear after a reviewer scores your first run.' : 'This player has no reviewed runs yet.'}
            {own && <div className="mt-4"><LinkButton href="/problems">Enter the arena</LinkButton></div>}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold uppercase text-white">Score history</h2>
            <p className="mb-3 text-xs text-slate-400">Each reviewed run, in order. Hover a point for details.</p>
            <ScoreTrend timeline={stats.timeline} />
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-slate-400">Show as table</summary>
              <table className="mt-2 w-full text-left text-xs">
                <thead className="text-slate-400">
                  <tr><th className="py-1">#</th><th>Challenge</th><th>Date</th><th className="text-right">Solution</th><th className="text-right">AI usage</th><th className="text-right">Final</th></tr>
                </thead>
                <tbody className="font-mono">
                  {stats.timeline.map((t, i) => (
                    <tr key={`${t.slug}-${t.date}`} className="border-t border-slate-800">
                      <td className="py-1">{i + 1}</td>
                      <td className="font-sans">
                        <Link href={own && t.solveId ? `/submissions/${t.solveId}` : `/problems/${t.slug}`} className="hover:text-neon-300">{t.problem}</Link>
                      </td>
                      <td className="font-sans">{formatDate(t.date)}</td>
                      <td className="text-right tabular-nums">{t.solutionScore}</td>
                      <td className="text-right tabular-nums">{t.aiUsageScore}</td>
                      <td className="text-right tabular-nums">{t.finalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-display text-lg font-bold uppercase text-white">Skill stats</h2>
            <RubricBars values={stats.rubric} />
            {weakest && (
              <p className="mt-6 rounded-lg border-l-2 border-xp-400 bg-xp-400/5 p-3 text-sm text-slate-200">
                <span className="font-display font-bold uppercase tracking-wide text-xp-300">Next unlock:</span> {TIPS[weakest[0]]}
              </p>
            )}
          </Card>
        </div>
      )}

      {stats.cleared.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="font-display text-lg font-bold uppercase text-white">Cleared challenges</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.cleared.map((c) => (
              <li key={c.slug}>
                <Link href={`/problems/${c.slug}`} className="press flex items-center gap-3 rounded-lg bg-slate-950/60 px-3 py-2.5 hover:bg-slate-800/70">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-xp-400" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{c.title}</span>
                  <DifficultyBadge value={c.difficulty} />
                  <span className="w-8 text-right"><ScorePill value={c.bestFinalScore} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
