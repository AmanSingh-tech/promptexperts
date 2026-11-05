'use client';

import { Suspense, use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight, Play, RotateCcw, Send, Trophy } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, LANGUAGE_LABELS } from '@/lib/format';
import { plural } from '@/lib/game';
import type { AISession, ContestDetail, Language, Problem, RunResult } from '@/lib/types';
import { Countdown } from '@/components/Countdown';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { ChatPanel } from '@/components/ChatPanel';
import { CodeEditor } from '@/components/CodeEditor';
import { Markdown } from '@/components/Markdown';
import { TestResults } from '@/components/TestResults';
import { Badge, Button, DifficultyBadge, ErrorBox, Spinner, cx } from '@/components/ui';

const LANGS: Language[] = ['python', 'cpp', 'javascript'];
type Pane = 'problem' | 'work' | 'ai';

function draftKey(problemId: string, lang: string) {
  return `ailogracer.draft.${problemId}.${lang}`;
}
function loadDraft(problemId: string, lang: string) {
  try {
    return localStorage.getItem(draftKey(problemId, lang));
  } catch {
    return null;
  }
}
function saveDraft(problemId: string, lang: string, value: string) {
  try {
    localStorage.setItem(draftKey(problemId, lang), value);
  } catch {
    // drafts are a convenience only
  }
}
function clearDrafts(problemId: string) {
  try {
    for (const l of [...LANGS, 'text']) localStorage.removeItem(draftKey(problemId, l));
  } catch {
    // ignore
  }
}

function Workspace({ slug }: { slug: string }) {
  const router = useRouter();
  const { refreshPlayer } = useAuth();
  const contestSlug = useSearchParams().get('contest');
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [session, setSession] = useState<AISession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language | 'text'>('python');
  const [code, setCode] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [pane, setPane] = useState<Pane>('work');
  const loaded = useRef(false);

  const starterFor = useCallback(
    (p: Problem, lang: Language | 'text') => (lang === 'text' ? '' : p.starterCode?.[lang] ?? ''),
    []
  );

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      try {
        const p = await api<Problem>(`/api/problems/${slug}`);
        setProblem(p);
        const lang: Language | 'text' = p.type === 'CODE' ? 'python' : 'text';
        setLanguage(lang);
        setCode(loadDraft(p.id, lang) ?? starterFor(p, lang));
        setSession(await api<AISession>('/api/sessions', { method: 'POST', body: { problemId: p.id } }));
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, [slug, starterFor]);

  const loadContest = useCallback(() => {
    if (contestSlug) api<ContestDetail>(`/api/contests/${contestSlug}`).then(setContest).catch(() => setContest(null));
  }, [contestSlug]);
  useEffect(loadContest, [loadContest]);

  const contestHasProblem = !!contest?.problems.some((p) => p.slug === slug);
  const countsForContest = !!contest && contest.state === 'LIVE' && contest.joined && contestHasProblem;

  async function joinContest() {
    if (!contest) return;
    try {
      await api(`/api/contests/${contest.slug}/join`, { method: 'POST' });
      toast.success(`Joined ${contest.title}`, { description: 'Your submissions on this challenge now count.' });
      loadContest();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  function changeCode(v: string) {
    setCode(v);
    if (problem) saveDraft(problem.id, language, v);
  }

  function recordPaste({ lines, chars }: { lines: number; chars: number }) {
    if (!session || (lines < 2 && chars < 80)) return;
    api(`/api/sessions/${session.id}/events`, { method: 'POST', body: { type: 'PASTE', lines, chars } }).catch(() => {});
  }

  function changeLanguage(lang: Language) {
    if (!problem) return;
    setLanguage(lang);
    setCode(loadDraft(problem.id, lang) ?? starterFor(problem, lang));
    setResult(null);
  }

  async function run() {
    if (!problem || !session) return;
    setRunning(true);
    setActionError(null);
    try {
      setResult(
        await api<RunResult>('/api/submissions/run', {
          method: 'POST',
          body: { problemId: problem.id, language, code, sessionId: session.id, ...(useCustom && { input: customInput }) }
        })
      );
      setSession((s) => (s ? { ...s, runCount: s.runCount + 1 } : s));
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  async function submit() {
    if (!problem || !session) return;
    const ok = window.confirm(
      countsForContest
        ? `Submit this attempt to ${contest!.title}? Your answer and AI conversation will be locked and sent for review. You can submit again before the contest ends; your best reviewed score counts.`
        : 'Submit this attempt? Your answer and your AI conversation will be locked and sent for review. You can start a new attempt afterwards.'
    );
    if (!ok) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const solve = await api<{ id: string }>('/api/submissions', {
        method: 'POST',
        body: { problemId: problem.id, sessionId: session.id, language, code, ...(countsForContest && { contestId: contest!.id }) }
      });
      clearDrafts(problem.id);
      refreshPlayer();
      toast.success(countsForContest ? `Submitted to ${contest!.title}` : 'Submitted', {
        description: 'Your answer and AI transcript are queued for review.'
      });
      router.push(`/submissions/${solve.id}`);
    } catch (err) {
      setActionError(errorMessage(err));
      setSubmitting(false);
    }
  }

  async function newAttempt() {
    if (!problem || !session) return;
    if (!window.confirm('Start a new attempt? The current AI conversation is discarded and will not be graded.')) return;
    try {
      await api(`/api/sessions/${session.id}/abandon`, { method: 'POST' });
      setSession(await api<AISession>('/api/sessions', { method: 'POST', body: { problemId: problem.id } }));
      setResult(null);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  if (error) return <div className="mx-auto mt-12 max-w-xl px-4"><ErrorBox message={error} /></div>;
  if (!problem || !session) return <Spinner className="mt-24" />;

  const isCode = problem.type === 'CODE';

  const problemPane = (
    <div className="h-full overflow-y-auto px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge value={problem.difficulty} />
        <Badge className="bg-slate-100 text-slate-700">{CATEGORY_LABELS[problem.category]}</Badge>
        <Badge className="bg-slate-100 text-slate-700">{isCode ? 'Code' : 'Written answer'}</Badge>
      </div>
      <h1 className="mt-3 text-xl font-bold leading-tight text-slate-900">{problem.title}</h1>
      <Markdown className="mt-4">{problem.description}</Markdown>
      {problem.constraints && (
        <>
          <h2 className="mt-6 text-sm font-bold text-slate-900">Constraints</h2>
          <pre className="mt-2 whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900">{problem.constraints}</pre>
        </>
      )}
      {isCode && problem.testCases.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-bold text-slate-900">Sample tests</h2>
          <div className="mt-2 space-y-3">
            {problem.testCases.map((t, i) => (
              <div key={t.id} className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Sample Input {i}</p>
                  <pre className="mt-1 max-h-32 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-900">{t.input}</pre>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600">Sample Output {i}</p>
                  <pre className="mt-1 max-h-32 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-900">{t.expectedOutput}</pre>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Submissions are judged on all {problem.totalTests} tests
            {problem.totalTests > problem.testCases.length && ` (${problem.totalTests - problem.testCases.length} hidden)`}. Time limit{' '}
            {problem.timeLimitMs / 1000}s per test.
            Read from stdin, write to stdout.
          </p>
        </>
      )}
    </div>
  );

  const workPane = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        {isCode ? (
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value as Language)}
            aria-label="Language"
            className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-base text-slate-900 sm:text-sm"
          >
            {LANGS.map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
          </select>
        ) : (
          <div className="flex rounded-md p-0.5 text-sm border border-slate-400">
            {['Write', 'Preview'].map((label, i) => (
              <button
                key={label}
                onClick={() => setPreview(i === 1)}
                className={cx('rounded px-2.5 py-0.5', preview === (i === 1) ? 'bg-slate-200' : 'text-slate-500')}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <span className="min-w-0 truncate text-xs text-slate-500">
          Attempt started {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isCode && ` · ${plural(session.runCount, 'run')}`}
        </span>
        <Button size="sm" variant="ghost" className="ml-auto shrink-0" onClick={newAttempt} title="Discard this attempt and start over">
          <RotateCcw className="h-4 w-4" /> <span className="hidden xl:inline">New attempt</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        {isCode || !preview ? (
          <CodeEditor key={language} language={language} value={code} onChange={changeCode} onPaste={recordPaste} />
        ) : (
          <div className="h-full overflow-y-auto p-4">
            {code.trim() ? <Markdown>{code}</Markdown> : <p className="text-sm text-slate-500">Nothing to preview yet.</p>}
          </div>
        )}
      </div>

      {(result || (isCode && useCustom) || actionError) && (
        <div className="max-h-[45%] overflow-y-auto border-t border-slate-200 p-3">
          <ErrorBox message={actionError} />
          {isCode && useCustom && (
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              rows={3}
              aria-label="Custom input"
              className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-base sm:text-xs"
            />
          )}
          {result && <div className="mt-3 first:mt-0"><TestResults result={result} /></div>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
        {isCode && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} />
            Test against custom input
          </label>
        )}
        <div className="ml-auto flex gap-2">
          {isCode && (
            <Button size="sm" variant="secondary" onClick={run} loading={running} disabled={!code.trim()}>
              {!running && <Play className="h-4 w-4" />} Run Code
            </Button>
          )}
          <Button size="sm" onClick={submit} loading={submitting} disabled={!code.trim()}>
            {!submitting && <Send className="h-4 w-4" />} {isCode ? 'Submit Code' : 'Submit Answer'}
          </Button>
        </div>
      </div>
    </div>
  );

  const aiPane = <ChatPanel session={session} onSession={setSession} />;

  const contestBanner = contest && contestHasProblem && (
    <div
      className={cx(
        'flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm',
        countsForContest ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-700'
      )}
    >
      <Trophy className={cx('h-4 w-4 shrink-0', countsForContest ? 'text-brand-700' : 'text-slate-500')} aria-hidden />
      <Link href={`/contests/${contest.slug}`} className="font-display font-bold hover:underline">{contest.title}</Link>
      {contest.state === 'LIVE' && contest.joined && (
        <span>
          Counts toward standings · ends in <Countdown to={contest.endsAt} onDone={loadContest} className="font-mono tabular-nums text-slate-900" />
        </span>
      )}
      {contest.state === 'LIVE' && !contest.joined && (
        <>
          <span>Join to make your submission count.</span>
          <Button size="sm" onClick={joinContest}>Join contest</Button>
        </>
      )}
      {contest.state === 'ENDED' && <span>This contest has ended, so this run is practice.</span>}
      {contest.state === 'UPCOMING' && <span>Starts in <Countdown to={contest.startsAt} onDone={loadContest} className="font-mono tabular-nums text-slate-900" /></span>}
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
        <Link href="/problems" className="hover:text-brand-700">Practice</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="truncate font-medium text-slate-900">{problem.title}</span>
      </nav>
      {contestBanner}
      <div className="flex lg:hidden border-b border-slate-200" role="tablist">
        {(['problem', 'work', 'ai'] as Pane[]).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={pane === p}
            onClick={() => setPane(p)}
            className={cx('press flex-1 py-2.5 font-display text-xs font-bold', pane === p ? 'border-b-2 border-brand-500 text-slate-900' : 'text-slate-600')}
          >
            {p === 'problem' ? 'Problem' : p === 'work' ? (isCode ? 'Code' : 'Answer') : `AI (${session.logs.length})`}
          </button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className={cx('min-h-0 border-r border-slate-200 bg-white', pane !== 'problem' && 'hidden lg:block')}>
          {problemPane}
        </section>
        <section className={cx('min-h-0 border-r border-slate-200 bg-white', pane !== 'work' && 'hidden lg:block')}>
          {workPane}
        </section>
        <section className={cx('min-h-0 bg-white', pane !== 'ai' && 'hidden lg:block')}>{aiPane}</section>
      </div>
    </div>
  );
}

export default function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <RequireAuth>
      <Suspense fallback={<Spinner className="mt-24" />}>
        <Workspace slug={slug} />
      </Suspense>
    </RequireAuth>
  );
}
