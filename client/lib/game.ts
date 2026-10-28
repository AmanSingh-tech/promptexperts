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
  { name: 'Diamond', min: 90, className: 'text-neon-300 border-neon-400/40 bg-neon-400/10' },
  { name: 'Platinum', min: 75, className: 'text-brand-200 border-brand-400/40 bg-brand-500/10' },
  { name: 'Gold', min: 60, className: 'text-amber-300 border-amber-400/40 bg-amber-400/10' },
  { name: 'Silver', min: 40, className: 'text-slate-200 border-slate-400/40 bg-slate-400/10' },
  { name: 'Bronze', min: 0, className: 'text-orange-300 border-orange-500/40 bg-orange-500/10' }
];

export function tierFor(avgFinalScore: number, evaluated: number): Tier | null {
  if (!evaluated) return null;
  return TIERS.find((t) => avgFinalScore >= t.min) ?? TIERS[TIERS.length - 1];
}

const pluralRules = new Intl.PluralRules('en');
export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n.toLocaleString()} ${pluralRules.select(n) === 'one' ? singular : pluralForm}`;
}
