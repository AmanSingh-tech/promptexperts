'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS, LANGUAGE_LABELS } from '@/lib/format';
import type { Category, Difficulty, Language, Problem, ProblemType } from '@/lib/types';
import { Markdown } from './Markdown';
import { Button, Card, ErrorBox, Field, inputClass } from './ui';

interface TestDraft { input: string; expectedOutput: string; isSample: boolean }

const LANGS: Language[] = ['python', 'cpp', 'javascript'];

export function ProblemForm({ initial }: { initial?: Problem }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [constraints, setConstraints] = useState(initial?.constraints ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'EASY');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'ALGORITHMS');
  const [type, setType] = useState<ProblemType>(initial?.type ?? 'CODE');
  const [timeLimitMs, setTimeLimitMs] = useState(initial?.timeLimitMs ?? 2000);
  const [published, setPublished] = useState(initial?.published ?? true);
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [starter, setStarter] = useState<Partial<Record<Language, string>>>(initial?.starterCode ?? {});
  const [tests, setTests] = useState<TestDraft[]>(
    initial?.testCases.map(({ input, expectedOutput, isSample }) => ({ input, expectedOutput, isSample })) ?? [{ input: '', expectedOutput: '', isSample: true }]
  );
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateTest = (i: number, patch: Partial<TestDraft>) => setTests(tests.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      title, description, constraints, difficulty, category, type, timeLimitMs, published,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      starterCode: Object.fromEntries(Object.entries(starter).filter(([, v]) => v?.trim())),
      testCases: type === 'CODE' ? tests : []
    };
    try {
      if (initial) await api(`/api/problems/${initial.id}`, { method: 'PATCH', body });
      else await api('/api/problems', { method: 'POST', body });
      router.push('/admin');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card className="space-y-4 p-5">
        <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as ProblemType)}>
              <option value="CODE">Code (auto-judged)</option>
              <option value="WRITTEN">Written (reviewer-graded)</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select className={inputClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium">Description (Markdown)</span>
            <button type="button" className="text-xs text-brand-600" onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button>
          </div>
          {preview ? (
            <div className="min-h-[12rem] rounded-lg border border-slate-200 p-3 dark:border-slate-700"><Markdown>{description || '_Nothing yet_'}</Markdown></div>
          ) : (
            <textarea className={`${inputClass} h-56 font-mono text-xs`} value={description} onChange={(e) => setDescription(e.target.value)} required />
          )}
        </div>
        <Field label="Constraints"><textarea className={`${inputClass} h-20 font-mono text-xs`} value={constraints} onChange={(e) => setConstraints(e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tags" hint="Comma separated"><input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
          {type === 'CODE' && (
            <Field label="Time limit (ms)">
              <input className={inputClass} type="number" min={500} max={10000} step={500} value={timeLimitMs} onChange={(e) => setTimeLimitMs(Number(e.target.value))} />
            </Field>
          )}
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published
          </label>
        </div>
      </Card>

      {type === 'CODE' && (
        <>
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Test cases</h2>
                <p className="text-xs text-slate-500">Samples are shown to participants; the rest stay hidden. Output is compared ignoring trailing whitespace.</p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={() => setTests([...tests, { input: '', expectedOutput: '', isSample: false }])}>
                <Plus className="h-4 w-4" /> Add test
              </Button>
            </div>
            {tests.map((t, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Test {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={t.isSample} onChange={(e) => updateTest(i, { isSample: e.target.checked })} /> Sample</label>
                    <button type="button" aria-label={`Remove test ${i + 1}`} onClick={() => setTests(tests.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <textarea className={`${inputClass} h-24 font-mono text-xs`} placeholder="stdin" value={t.input} onChange={(e) => updateTest(i, { input: e.target.value })} />
                  <textarea className={`${inputClass} h-24 font-mono text-xs`} placeholder="expected stdout" value={t.expectedOutput} onChange={(e) => updateTest(i, { expectedOutput: e.target.value })} />
                </div>
              </div>
            ))}
          </Card>
          <Card className="space-y-4 p-5">
            <h2 className="font-semibold">Starter code (optional)</h2>
            {LANGS.map((l) => (
              <Field key={l} label={LANGUAGE_LABELS[l]}>
                <textarea className={`${inputClass} h-28 font-mono text-xs`} value={starter[l] ?? ''} onChange={(e) => setStarter({ ...starter, [l]: e.target.value })} />
              </Field>
            ))}
          </Card>
        </>
      )}

      <ErrorBox message={error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push('/admin')}>Cancel</Button>
        <Button type="submit" loading={saving}>{initial ? 'Save changes' : 'Create problem'}</Button>
      </div>
    </form>
  );
}
