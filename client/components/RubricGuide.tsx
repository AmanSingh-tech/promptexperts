import { RUBRIC_GUIDE, type RubricGuideEntry } from '@/lib/rubric-guide';
import { cx } from './ui';

export function RubricAnchors({ entry, compact }: { entry: RubricGuideEntry; compact?: boolean }) {
  return (
    <div className={cx('space-y-2', compact ? 'text-xs' : 'text-sm')}>
      <p className="text-slate-300">{entry.question}</p>
      <ol className="space-y-1.5">
        {entry.levels.map((l) => (
          <li key={l.score} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
            <span className="chamfer-sm grid h-6 place-items-center bg-slate-800 font-mono font-semibold text-neon-300">{l.score}</span>
            <span>
              <span className="text-slate-200">{l.summary}</span>
              <span className="block text-slate-400">e.g. {l.example}</span>
            </span>
          </li>
        ))}
      </ol>
      {!compact && (
        <p className="text-slate-400">
          <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-amber-300">Watch for:</span> {entry.watchFor.join(' · ')}
        </p>
      )}
    </div>
  );
}

export function RubricGuide() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {RUBRIC_GUIDE.map((entry) => (
        <section key={entry.key} className="rounded-xl bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgb(160_166_196_/_0.12)]">
          <h2 className="mb-3 font-display text-lg font-bold uppercase text-white">{entry.label}</h2>
          <RubricAnchors entry={entry} />
        </section>
      ))}
    </div>
  );
}
