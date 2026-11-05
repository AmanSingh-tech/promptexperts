import type { Progress } from './types';

export const XP_PER_LEVEL = 100;

export function levelFor(totalPoints: number) {
  const level = Math.floor(totalPoints / XP_PER_LEVEL) + 1;
  const into = totalPoints % XP_PER_LEVEL;
  return { level, into, toNext: XP_PER_LEVEL - into, progress: into / XP_PER_LEVEL };
}

export interface Tier {
  name: string;
  min: number;
  className: string;
}

// Tier reflects quality (average final score), not volume; level reflects volume.
export const TIERS: Tier[] = [
  { name: 'Diamond', min: 90, className: 'text-sky-700 border-sky-300 bg-sky-50' },
  { name: 'Platinum', min: 75, className: 'text-indigo-700 border-indigo-300 bg-indigo-50' },
  { name: 'Gold', min: 60, className: 'text-amber-800 border-amber-300 bg-amber-50' },
  { name: 'Silver', min: 40, className: 'text-slate-700 border-slate-300 bg-slate-100' },
  { name: 'Bronze', min: 0, className: 'text-orange-800 border-orange-300 bg-orange-50' }
];

export function tierFor(avgFinalScore: number, evaluated: number): Tier | null {
  if (!evaluated) return null;
  return TIERS.find((t) => avgFinalScore >= t.min) ?? TIERS[TIERS.length - 1];
}

// Only gains are celebrated. A rank that slipped or a re-review that lowered a score stays quiet.
export function progressGains({ previous: before, current, newAchievements }: Progress) {
  const xp = Math.max(0, current.totalPoints - before.totalPoints);
  const level = levelFor(current.totalPoints).level;
  const beforeTier = tierFor(before.avgFinalScore, before.evaluated);
  const tier = tierFor(current.avgFinalScore, current.evaluated);
  const tierUp = tier && (!beforeTier || tier.min > beforeTier.min) ? tier : null;
  const rankUp = current.rank != null && (before.rank == null || current.rank < before.rank) ? { from: before.rank, to: current.rank } : null;
  return {
    xp,
    level: level > levelFor(before.totalPoints).level ? level : null,
    tier: tierUp,
    rank: rankUp,
    achievements: newAchievements,
    any: xp > 0 || !!tierUp || !!rankUp || newAchievements.length > 0
  };
}

const pluralRules = new Intl.PluralRules('en');
export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n.toLocaleString()} ${pluralRules.select(n) === 'one' ? singular : pluralForm}`;
}
