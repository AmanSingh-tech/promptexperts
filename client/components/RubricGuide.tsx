import { RUBRIC_GUIDE, type RubricGuideEntry } from '@/lib/rubric-guide';
import { cx } from './ui';

export function RubricAnchors({ entry, compact }: { entry: RubricGuideEntry; compact?: boolean }) {
  return (
    <div className={cx('space-y-2', compact ? 'text-xs' : 'text-sm')}>
      <p className="text-slate-700">{entry.question}</p>
      <ol className="space-y-1.5">
        {entry.levels.map((l) => (
          <li key={l.score} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
            <span className="grid h-6 place-items-center bg-slate-100 font-mono font-semibold text-brand-700">{l.score}</span>
            <span>
              <span className="text-slate-800">{l.summary}</span>
              <span className="block text-slate-600">e.g. {l.example}</span>
            </span>
          </li>
        ))}
      </ol>
      {!compact && (
        <p className="text-slate-600">
          <span className="font-display text-[11px] font-semibold text-amber-700">Watch for:</span> {entry.watchFor.join(' · ')}
        </p>
      )}
    </div>
  );
}

export function RubricGuide() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {RUBRIC_GUIDE.map((entry) => (
        <section key={entry.key} className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-slate-900">{entry.label}</h2>
          <RubricAnchors entry={entry} />
        </section>
      ))}
    </div>
  );
}
