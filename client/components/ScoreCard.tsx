import type { Evaluation } from '@/lib/types';
import { RUBRIC } from '@/lib/format';
import { Card, ScorePill } from './ui';

export function RubricBars({ values }: { values: Partial<Record<(typeof RUBRIC)[number]['key'], number | null>> }) {
  return (
    <div className="space-y-3">
      {RUBRIC.map((r) => {
        const v = values[r.key];
        return (
          <div key={r.key}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{r.label}</span>
              <span className="tabular-nums text-slate-500">{v ?? '–'} / 5</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800" role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={v ?? undefined} aria-label={r.label}>
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${((v ?? 0) / 5) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{r.hint}</p>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreCard({ evaluation }: { evaluation: Evaluation }) {
  return (
    <Card className="p-5">
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          ['Solution', evaluation.solutionScore, '40%'],
          ['AI usage', evaluation.aiUsageScore, '60%'],
          ['Final', evaluation.finalScore, '']
        ].map(([label, value, weight]) => (
          <div key={label as string} className={label === 'Final' ? 'rounded-lg bg-brand-50 py-2 dark:bg-brand-900/30' : 'py-2'}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}{weight && <span className="ml-1 normal-case">({weight})</span>}</p>
            <p className="mt-1 text-2xl"><ScorePill value={value as number} /></p>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <RubricBars values={evaluation} />
      </div>
      {evaluation.notes && (
        <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <p className="mb-1 text-xs font-medium text-slate-500">Reviewer notes{evaluation.reviewer && ` · ${evaluation.reviewer.username}`}</p>
          <p className="whitespace-pre-wrap">{evaluation.notes}</p>
        </div>
      )}
    </Card>
  );
}
