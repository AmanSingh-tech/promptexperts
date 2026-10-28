'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, RotateCcw, Send, Terminal } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, LANGUAGE_LABELS } from '@/lib/format';
import type { AISession, Language, Problem, RunResult } from '@/lib/types';
import { RequireAuth } from '@/components/RequireAuth';
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

  function changeCode(v: string) {
    setCode(v);
    if (problem) saveDraft(problem.id, language, v);
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
      'Submit this attempt? Your answer and your AI conversation will be locked and sent for review. You can start a new attempt afterwards.'
    );
    if (!ok) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const solve = await api<{ id: string }>('/api/submissions', {
        method: 'POST',
        body: { problemId: problem.id, sessionId: session.id, language, code }
      });
      clearDrafts(problem.id);
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
        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{CATEGORY_LABELS[problem.category]}</Badge>
        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{isCode ? 'Code' : 'Written answer'}</Badge>
      </div>
      <h1 className="mt-3 text-xl font-bold">{problem.title}</h1>
      <Markdown className="mt-4">{problem.description}</Markdown>
      {problem.constraints && (
        <>
          <h2 className="mt-6 text-sm font-semibold">Constraints</h2>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-100 p-3 font-mono text-xs dark:bg-slate-800">{problem.constraints}</pre>
        </>
      )}
      {isCode && problem.testCases.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-semibold">Sample tests</h2>
          <div className="mt-2 space-y-3">
            {problem.testCases.map((t, i) => (
              <div key={t.id} className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Input {i + 1}</p>
                  <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-slate-100 p-2 font-mono text-xs dark:bg-slate-800">{t.input}</pre>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Output {i + 1}</p>
                  <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-slate-100 p-2 font-mono text-xs dark:bg-slate-800">{t.expectedOutput}</pre>
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
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        {isCode ? (
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value as Language)}
            aria-label="Language"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {LANGS.map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
          </select>
        ) : (
          <div className="flex rounded-md border border-slate-300 p-0.5 text-sm dark:border-slate-600">
            {['Write', 'Preview'].map((label, i) => (
              <button
                key={label}
                onClick={() => setPreview(i === 1)}
                className={cx('rounded px-2.5 py-0.5', preview === (i === 1) ? 'bg-slate-200 dark:bg-slate-700' : 'text-slate-500')}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <span className="text-xs text-slate-500">
          Attempt started {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isCode && ` · ${session.runCount} runs`}
        </span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={newAttempt} title="Discard this attempt and start over">
            <RotateCcw className="h-4 w-4" /> <span className="hidden xl:inline">New attempt</span>
          </Button>
          {isCode && (
            <Button size="sm" variant="secondary" onClick={run} loading={running} disabled={!code.trim()}>
              {!running && <Play className="h-4 w-4" />} Run
            </Button>
          )}
          <Button size="sm" variant="success" onClick={submit} loading={submitting} disabled={!code.trim()}>
            {!submitting && <Send className="h-4 w-4" />} Submit
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {isCode || !preview ? (
          <CodeEditor language={language} value={code} onChange={changeCode} />
        ) : (
          <div className="h-full overflow-y-auto p-4">
            {code.trim() ? <Markdown>{code}</Markdown> : <p className="text-sm text-slate-500">Nothing to preview yet.</p>}
          </div>
        )}
      </div>

      {(isCode || actionError) && (
        <div className="max-h-[45%] overflow-y-auto border-t border-slate-200 p-3 dark:border-slate-800">
          <ErrorBox message={actionError} />
          {isCode && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} />
                <Terminal className="h-4 w-4 text-slate-500" /> Run with custom input instead of the samples
              </label>
              {useCustom && (
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  rows={3}
                  aria-label="Custom input"
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-800"
                />
              )}
              {result && <div className="mt-3"><TestResults result={result} /></div>}
            </>
          )}
        </div>
      )}
    </div>
  );

  const aiPane = <ChatPanel session={session} onSession={setSession} />;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex border-b border-slate-200 lg:hidden dark:border-slate-800" role="tablist">
        {(['problem', 'work', 'ai'] as Pane[]).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={pane === p}
            onClick={() => setPane(p)}
            className={cx('flex-1 py-2 text-sm font-medium', pane === p ? 'border-b-2 border-brand-600 text-brand-700 dark:text-brand-300' : 'text-slate-500')}
          >
            {p === 'problem' ? 'Problem' : p === 'work' ? (isCode ? 'Code' : 'Answer') : `AI (${session.logs.length})`}
          </button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className={cx('min-h-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900', pane !== 'problem' && 'hidden lg:block')}>
          {problemPane}
        </section>
        <section className={cx('min-h-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900', pane !== 'work' && 'hidden lg:block')}>
          {workPane}
        </section>
        <section className={cx('min-h-0 bg-slate-50 dark:bg-slate-950', pane !== 'ai' && 'hidden lg:block')}>{aiPane}</section>
      </div>
    </div>
  );
}

export default function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <RequireAuth>
      <Workspace slug={slug} />
    </RequireAuth>
  );
}
