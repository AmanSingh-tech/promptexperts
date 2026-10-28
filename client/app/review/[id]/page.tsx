'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { RUBRIC, formatDate } from '@/lib/format';
import type { Analysis, Rubric, Submission } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
import { SubmissionTabs } from '@/components/SubmissionView';
import { Button, Card, DifficultyBadge, ErrorBox, Field, ScorePill, Spinner, StatusBadge, cx, inputClass } from '@/components/ui';

const usageScore = (r: Rubric) => Math.round(((RUBRIC.reduce((a, k) => a + r[k.key], 0) / 4 - 1) / 4) * 100);

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Reviewer({ id }: { id: string }) {
  const router = useRouter();
  const [s, setS] = useState<Submission | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [solutionScore, setSolutionScore] = useState(50);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Submission>(`/api/submissions/${id}`), api<Analysis>(`/api/evaluations/${id}/analysis`)])
      .then(([sub, an]) => {
        setS(sub);
        setAnalysis(an);
        const e = sub.evaluation;
        setRubric(e ? { aiEfficiency: e.aiEfficiency, aiLearning: e.aiLearning, aiTransparency: e.aiTransparency, aiInnovation: e.aiInnovation } : an.suggested);
        if (e) {
          setSolutionScore(e.solutionScore);
          setNotes(e.notes ?? '');
        }
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  async function askClaude() {
    setAiLoading(true);
    setAiError(null);
    try {
      setAnalysis(await api<Analysis>(`/api/evaluations/${id}/ai-review`, { method: 'POST' }));
    } catch (e) {
      setAiError(errorMessage(e));
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    if (!rubric || !s) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/evaluations/${id}`, {
        method: 'PUT',
        body: { ...rubric, notes, ...(s.problem.type === 'WRITTEN' && { solutionScore }) }
      });
      router.push('/review');
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  if (error && !s) return <div className="mx-auto mt-12 max-w-xl px-4"><ErrorBox message={error} /></div>;
  if (!s || !analysis || !rubric) return <Spinner className="mt-24" />;

  const isCode = s.problem.type === 'CODE';
  const solution = isCode ? s.autoScore ?? 0 : solutionScore;
  const usage = usageScore(rubric);
  const final = Math.round(solution * 0.4 + usage * 0.6);
  const m = analysis.metrics;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Link href="/review" className="text-sm text-slate-500 hover:underline">← Review queue</Link>
        <h1 className="mt-1 text-2xl font-bold">{s.problem.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <DifficultyBadge value={s.problem.difficulty} />
          <StatusBadge value={s.status} />
          <span>by <strong className="text-slate-700 dark:text-slate-200">{s.user.username}</strong> · {formatDate(s.submittedAt)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <SubmissionTabs submission={s} defaultTab="ai" />
          <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <summary className="cursor-pointer text-sm font-medium">Problem statement</summary>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{s.problem.description}</p>
          </details>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold">Automatic analysis</h2>
            <p className="text-xs text-slate-500">Heuristics from the transcript. Use them as hints, not verdicts.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Metric label="Prompts" value={m.promptCount} />
              <Metric label="Avg words" value={m.avgPromptWords ?? '–'} />
              <Metric label="Duration" value={m.durationMinutes != null ? `${m.durationMinutes}m` : '–'} />
              <Metric label="Why/how Qs" value={m.conceptualQuestions ?? 0} />
              <Metric label="Asked for code" value={m.solutionRequests ?? 0} />
              {isCode && <Metric label="Copied code" value={`${m.copyOverlapPct ?? 0}%`} />}
            </div>
            {(analysis.strengths.length > 0 || analysis.concerns.length > 0) && (
              <ul className="mt-3 space-y-1 text-sm">
                {analysis.strengths.map((f) => (
                  <li key={f} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-label="Strength" />{f}</li>
                ))}
                {analysis.concerns.map((f) => (
                  <li key={f} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="Concern" />{f}</li>
                ))}
              </ul>
            )}
            {analysis.metrics.importedLogs && <p className="mt-2 text-xs text-violet-700 dark:text-violet-300">Includes a transcript imported from an external AI tool.</p>}
            <p className="mt-3 text-xs text-slate-500">
              Suggested: {RUBRIC.map((r) => `${r.label} ${analysis.suggested[r.key]}`).join(' · ')}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-brand-500" /> Claude&apos;s second opinion</h2>
              <Button size="sm" variant="secondary" onClick={askClaude} loading={aiLoading}>{analysis.ai ? 'Regenerate' : 'Generate'}</Button>
            </div>
            <ErrorBox message={aiError} />
            {analysis.ai ? (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-xs text-slate-500">{RUBRIC.map((r) => `${r.label} ${analysis.ai![r.key]}`).join(' · ')}</p>
                <p>{analysis.ai.rationale}</p>
                {analysis.ai.strengths.length > 0 && (
                  <ul className="list-disc pl-5 text-emerald-700 dark:text-emerald-400">{analysis.ai.strengths.map((x) => <li key={x}>{x}</li>)}</ul>
                )}
                {analysis.ai.concerns.length > 0 && (
                  <ul className="list-disc pl-5 text-rose-700 dark:text-rose-400">{analysis.ai.concerns.map((x) => <li key={x}>{x}</li>)}</ul>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRubric({ aiEfficiency: analysis.ai!.aiEfficiency, aiLearning: analysis.ai!.aiLearning, aiTransparency: analysis.ai!.aiTransparency, aiInnovation: analysis.ai!.aiInnovation })}
                >
                  Use these scores
                </Button>
              </div>
            ) : (
              !aiError && <p className="mt-2 text-sm text-slate-500">Optional. Claude reads the transcript and answer, then suggests scores with reasons.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Your scores</h2>
            <div className="mt-4 space-y-4">
              {!isCode && (
                <Field label={`Solution quality: ${solutionScore}/100`} hint="Written answers are graded by you">
                  <input type="range" min={0} max={100} value={solutionScore} onChange={(e) => setSolutionScore(Number(e.target.value))} className="w-full accent-brand-600" />
                </Field>
              )}
              {isCode && <p className="text-sm text-slate-500">Solution score is set by the tests: <strong>{solution}</strong>/100</p>}
              {RUBRIC.map((r) => (
                <div key={r.key}>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-slate-500">{r.hint}</p>
                  <div className="mt-1.5 grid grid-cols-5 gap-1" role="radiogroup" aria-label={r.label}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        role="radio"
                        aria-checked={rubric[r.key] === v}
                        onClick={() => setRubric({ ...rubric, [r.key]: v })}
                        className={cx(
                          'rounded-md py-1.5 text-sm font-semibold',
                          rubric[r.key] === v ? 'bg-brand-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Field label="Notes for the participant" hint="Required. Explain what was good and what to improve.">
                <textarea className={`${inputClass} h-28`} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                <div><p className="text-xs text-slate-500">Solution</p><ScorePill value={solution} /></div>
                <div><p className="text-xs text-slate-500">AI usage</p><ScorePill value={usage} /></div>
                <div><p className="text-xs text-slate-500">Final</p><ScorePill value={final} /></div>
              </div>
              <ErrorBox message={error} />
              <Button className="w-full" onClick={save} loading={saving} disabled={!notes.trim()}>
                {s.evaluation ? 'Update review' : 'Submit review'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth roles={['REVIEWER', 'ADMIN']}>
      <Reviewer id={id} />
    </RequireAuth>
  );
}
