'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, BookOpen, CheckCircle2, EyeOff, Sparkles, Users } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { RUBRIC, formatDate } from '@/lib/format';
import { RUBRIC_GUIDE } from '@/lib/rubric-guide';
import type { Analysis, Evaluation, Rubric, ReviewsResponse, Submission } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { RubricAnchors } from '@/components/RubricGuide';
import { RequireAuth } from '@/components/RequireAuth';
import { SubmissionTabs } from '@/components/SubmissionView';
import { Button, Card, DifficultyBadge, ErrorBox, Field, ScorePill, Spinner, StatusBadge, cx, inputClass } from '@/components/ui';

const usageScore = (r: Rubric) => Math.round(((RUBRIC.reduce((a, k) => a + r[k.key], 0) / 4 - 1) / 4) * 100);

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-600">{label}</p>
      <p className="font-mono font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function Reviewer({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [s, setS] = useState<Submission | null>(null);
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [guideFor, setGuideFor] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [solutionScore, setSolutionScore] = useState(50);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Submission>(`/api/submissions/${id}`),
      api<Analysis>(`/api/evaluations/${id}/analysis`),
      api<ReviewsResponse>(`/api/evaluations/${id}/reviews`)
    ])
      .then(([sub, an, rv]) => {
        setS(sub);
        setAnalysis(an);
        setReviews(rv);
        const mine = rv.mine;
        setRubric(mine ? { aiEfficiency: mine.aiEfficiency, aiLearning: mine.aiLearning, aiTransparency: mine.aiTransparency, aiInnovation: mine.aiInnovation } : an.suggested);
        if (mine) {
          setSolutionScore(mine.solutionScore ?? 50);
          setNotes(mine.notes);
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
      const result = await api<Evaluation>(`/api/evaluations/${id}`, {
        method: 'PUT',
        body: { ...rubric, notes, ...(s.problem.type === 'WRITTEN' && { solutionScore }) }
      });
      const remaining = (reviews?.requiredReviews ?? 1) - result.reviewCount;
      if (result.status === 'FINAL') toast.success('Review saved', { description: `Final score ${result.finalScore}. The player can see it now.` });
      else if (result.status === 'PENDING') toast.success('Review saved', { description: `Waiting for ${remaining} more review${remaining === 1 ? '' : 's'} before the result is final.` });
      else toast.warning('Reviewers disagree', { description: 'The result is disputed until an admin accepts it or adds a deciding review.' });
      router.push('/review');
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  async function accept() {
    setAccepting(true);
    try {
      const evaluation = await api<Evaluation>(`/api/evaluations/${id}/accept`, { method: 'POST' });
      setReviews((r) => (r ? { ...r, evaluation } : r));
      toast.success('Result accepted', { description: `Final score ${evaluation.finalScore}.` });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAccepting(false);
    }
  }

  if (error && !s) return <div className="mx-auto mt-12 max-w-xl px-4"><ErrorBox message={error} /></div>;
  if (!s || !analysis || !rubric || !reviews) return <Spinner className="mt-24" />;
  const ownSubmission = s.user.id === user?.id;

  const isCode = s.problem.type === 'CODE';
  const solution = isCode ? s.autoScore ?? 0 : solutionScore;
  const usage = usageScore(rubric);
  const final = Math.round(solution * 0.4 + usage * 0.6);
  const m = analysis.metrics;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Link href="/review" className="font-display text-xs font-semibold text-brand-700 hover:text-brand-700">← Review queue</Link>
        <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">{s.problem.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <DifficultyBadge value={s.problem.difficulty} />
          <StatusBadge value={s.status} />
          <span>by <strong className="text-slate-800">{s.user.username}</strong> · {formatDate(s.submittedAt)}</span>
          <span className="font-mono">· {reviews.count}/{reviews.requiredReviews} reviews</span>
          <Link href="/review/guide" className="ml-auto inline-flex items-center gap-1 font-display text-xs font-semibold text-brand-700 hover:text-brand-700">
            <BookOpen className="h-3.5 w-3.5" /> Rubric guide
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <SubmissionTabs submission={s} defaultTab="ai" />
          <details className="rounded-md border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer font-display text-sm font-bold text-slate-800">Problem statement</summary>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{s.problem.description}</p>
          </details>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold text-slate-900">Automatic analysis</h2>
            <p className="text-xs text-slate-500">Heuristics from the transcript. Use them as hints, not verdicts.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Metric label="Prompts" value={m.promptCount} />
              <Metric label="Avg words" value={m.avgPromptWords ?? '–'} />
              <Metric label="Duration" value={m.durationMinutes != null ? `${m.durationMinutes}m` : '–'} />
              <Metric label="Why/how Qs" value={m.conceptualQuestions ?? 0} />
              <Metric label="Asked for code" value={m.solutionRequests ?? 0} />
              {isCode && <Metric label="Copied code" value={`${m.copyOverlapPct ?? 0}%`} />}
              {m.process && isCode && <Metric label="Runs" value={m.process.runs} />}
              {m.process && <Metric label="Large pastes" value={m.process.largePastes} />}
              {m.process && isCode && (
                <Metric label="1st run done" value={m.process.firstRunCompletenessPct == null ? '–' : `${m.process.firstRunCompletenessPct}%`} />
              )}
            </div>
            {(analysis.strengths.length > 0 || analysis.concerns.length > 0) && (
              <ul className="mt-3 space-y-1 text-sm">
                {analysis.strengths.map((f) => (
                  <li key={f} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-label="Strength" />{f}</li>
                ))}
                {analysis.concerns.map((f) => (
                  <li key={f} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="Concern" />{f}</li>
                ))}
              </ul>
            )}
            {analysis.metrics.importedLogs && <p className="mt-2 text-xs text-brand-700">Includes a transcript imported from an external AI tool.</p>}
            <p className="mt-3 text-xs text-slate-500">
              Suggested: {RUBRIC.map((r) => `${r.label} ${analysis.suggested[r.key]}`).join(' · ')}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900"><Sparkles className="h-4 w-4 text-brand-700" /> Claude&apos;s take</h2>
              <Button size="sm" variant="secondary" onClick={askClaude} loading={aiLoading}>{analysis.ai ? 'Regenerate' : 'Generate'}</Button>
            </div>
            <ErrorBox message={aiError} />
            {analysis.ai ? (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-xs text-slate-500">{RUBRIC.map((r) => `${r.label} ${analysis.ai![r.key]}`).join(' · ')}</p>
                <p>{analysis.ai.rationale}</p>
                {analysis.ai.strengths.length > 0 && (
                  <ul className="list-disc pl-5 text-brand-700">{analysis.ai.strengths.map((x) => <li key={x}>{x}</li>)}</ul>
                )}
                {analysis.ai.concerns.length > 0 && (
                  <ul className="list-disc pl-5 text-rose-700">{analysis.ai.concerns.map((x) => <li key={x}>{x}</li>)}</ul>
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

          {(reviews.count > (reviews.mine ? 1 : 0) || reviews.evaluation?.status === 'DISPUTED') && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                <Users className="h-4 w-4 text-brand-700" /> Other reviews
              </h2>
              {reviews.hidden ? (
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                  <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
                  {reviews.count} other review{reviews.count === 1 ? ' is' : 's are'} hidden until you submit yours, so your scores stay independent.
                </p>
              ) : (
                <>
                  <ul className="mt-3 space-y-3">
                    {reviews.reviews
                      .filter((r) => r.reviewerId !== user?.id)
                      .map((r) => (
                        <li key={r.id} className="rounded-md bg-slate-50 p-3 text-sm">
                          <p className="flex justify-between font-display text-xs font-bold text-slate-700">
                            <span>{r.reviewer.username}</span>
                            <span className="font-mono normal-case text-slate-600">
                              {RUBRIC.map((k) => r[k.key]).join(' · ')}
                              {r.solutionScore != null && ` · sol ${r.solutionScore}`}
                            </span>
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-slate-700">{r.notes}</p>
                        </li>
                      ))}
                  </ul>
                  {reviews.evaluation?.status === 'DISPUTED' && (
                    <div className="mt-4 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-700">
                      <p className="flex items-center gap-2 font-display font-bold text-amber-700">
                        <AlertTriangle className="h-4 w-4" /> Disputed
                      </p>
                      <p className="mt-1">
                        Reviewers disagree by 2+ rubric points or a wide score gap. The averaged result ({reviews.evaluation.finalScore}) is hidden from
                        the player until an admin accepts it or adds a deciding review.
                      </p>
                      {user?.role === 'ADMIN' && (
                        <Button size="sm" className="mt-3" onClick={accept} loading={accepting}>Accept averaged result</Button>
                      )}
                    </div>
                  )}
                  {reviews.evaluation?.status === 'FINAL' && (
                    <p className="mt-3 text-xs text-slate-600">Final combined score: <ScorePill value={reviews.evaluation.finalScore} /></p>
                  )}
                </>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-display text-lg font-bold text-slate-900">Your scores</h2>
            <div className="mt-4 space-y-4">
              {!isCode && (
                <Field label={`Solution quality: ${solutionScore}/100`} hint="Written answers are graded by you">
                  <input type="range" min={0} max={100} value={solutionScore} onChange={(e) => setSolutionScore(Number(e.target.value))} className="w-full accent-brand-600" />
                </Field>
              )}
              {isCode && <p className="text-sm text-slate-600">Solution score is set by the tests: <strong className="text-slate-900">{solution}</strong>/100</p>}
              {RUBRIC.map((r) => (
                <div key={r.key}>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-bold text-slate-900">{r.label}</p>
                    <button
                      onClick={() => setGuideFor(guideFor === r.key ? null : r.key)}
                      aria-expanded={guideFor === r.key}
                      className="font-display text-[11px] font-semibold text-brand-700 hover:text-brand-700"
                    >
                      {guideFor === r.key ? 'Hide anchors' : 'Anchors'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">{r.hint}</p>
                  {guideFor === r.key && (
                    <div className="mt-2 rounded-md bg-slate-50 p-3">
                      <RubricAnchors entry={RUBRIC_GUIDE.find((g) => g.key === r.key)!} compact />
                    </div>
                  )}
                  <div className="mt-1.5 grid grid-cols-5 gap-1" role="radiogroup" aria-label={r.label}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        role="radio"
                        aria-checked={rubric[r.key] === v}
                        onClick={() => setRubric({ ...rubric, [r.key]: v })}
                        className={cx(
                          'press py-1.5 font-mono text-sm font-semibold',
                          rubric[r.key] === v ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Field label="Notes for the player" hint="Required. Explain what was good and what to improve.">
                <textarea className={`${inputClass} h-28`} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <div className="grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-3 text-center">
                <div><p className="text-xs text-slate-600">Solution</p><ScorePill value={solution} /></div>
                <div><p className="text-xs text-slate-600">AI usage</p><ScorePill value={usage} /></div>
                <div><p className="text-xs text-slate-600">Your final</p><ScorePill value={final} /></div>
              </div>
              <ErrorBox message={error} />
              <Button className="w-full" onClick={save} loading={saving} disabled={!notes.trim() || ownSubmission}>
                {ownSubmission ? 'You cannot review your own run' : reviews.mine ? 'Update your review' : 'Submit review'}
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
