import { Brain, Eye, Lightbulb, Target } from 'lucide-react';
import type { Evaluation, Review } from '@/lib/types';
import { RUBRIC } from '@/lib/format';
import { AnimatedNumber } from './AnimatedNumber';
import { Card, cx, scoreTone } from './ui';

const ICONS = { aiEfficiency: Target, aiLearning: Brain, aiTransparency: Eye, aiInnovation: Lightbulb } as const;

export function RubricBars({ values }: { values: Partial<Record<(typeof RUBRIC)[number]['key'], number | null>> }) {
  return (
    <div className="space-y-4">
      {RUBRIC.map((r) => {
        const v = values[r.key];
        const Icon = ICONS[r.key];
        return (
          <div key={r.key}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                <Icon className="h-4 w-4 text-brand-700" aria-hidden /> {r.label}
              </span>
              <span className="font-mono text-sm tabular-nums text-slate-700">{v ?? '–'}<span className="text-slate-500">/5</span></span>
            </div>
            <div className="mt-1.5 grid grid-cols-5 gap-1" role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={v ?? undefined} aria-label={r.label}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={cx(
                    'h-2',
                    v != null && n <= v ? 'bg-brand-600' : 'bg-slate-100'
                  )}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-600">{r.hint}</p>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreCard({ evaluation, reviews = [] }: { evaluation: Evaluation; reviews?: Review[] }) {
  return (
    <Card className="p-5">
      <p className="font-display text-xs font-semibold text-brand-700">Result</p>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className={cx('font-mono text-6xl font-semibold leading-none tabular-nums', scoreTone(evaluation.finalScore))}>
            <AnimatedNumber value={evaluation.finalScore} />
          </p>
          <p className="mt-1 font-display text-xs font-semibold text-slate-600">Final score · XP earned</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {[
          ['Solution', evaluation.solutionScore, '40%'],
          ['AI usage', evaluation.aiUsageScore, '60%']
        ].map(([label, value, weight]) => (
          <div key={label as string} className="rounded-md bg-slate-50 px-3 py-2">
            <p className="font-display text-[11px] font-semibold text-slate-600">{label} <span className="text-slate-500">({weight})</span></p>
            <p className={cx('font-mono text-2xl font-semibold tabular-nums', scoreTone(value as number))}><AnimatedNumber value={value as number} /></p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <RubricBars values={evaluation} />
      </div>
      {reviews.length > 1 && (
        <p className="mt-6 font-display text-[11px] font-semibold text-slate-600">
          Averaged from {reviews.length} independent reviews
        </p>
      )}
      {reviews.length > 0
        ? reviews.map((r) => (
            <div key={r.id} className="mt-3 rounded-md border-l-2 border-brand-500 bg-slate-50 p-3 text-sm">
              <p className="mb-1 flex justify-between font-display text-[11px] font-semibold text-slate-600">
                <span>Reviewer notes · {r.reviewer.username}</span>
                {reviews.length > 1 && <span className="font-mono normal-case">{[r.aiEfficiency, r.aiLearning, r.aiTransparency, r.aiInnovation].join(' · ')}</span>}
              </p>
              <p className="whitespace-pre-wrap text-slate-800">{r.notes}</p>
            </div>
          ))
        : evaluation.notes && (
            <div className="mt-6 rounded-md border-l-2 border-brand-500 bg-slate-50 p-3 text-sm">
              <p className="mb-1 font-display text-[11px] font-semibold text-slate-600">Reviewer notes{evaluation.reviewer && ` · ${evaluation.reviewer.username}`}</p>
              <p className="whitespace-pre-wrap text-slate-800">{evaluation.notes}</p>
            </div>
          )}
    </Card>
  );
}
