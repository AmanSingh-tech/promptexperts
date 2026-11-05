'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Search } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/lib/format';
import { plural } from '@/lib/game';
import type { Category, Difficulty, ProblemSummary, ProblemType } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { DailyCard } from '@/components/DailyCard';
import { XpBar } from '@/components/XpBar';
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Spinner, cx, inputClass } from '@/components/ui';

const DIFFICULTY_TEXT: Record<Difficulty, string> = { EASY: 'text-brand-700', MEDIUM: 'text-amber-800', HARD: 'text-rose-700' };
const STATUS_LABELS = { solved: 'Solved', unsolved: 'Unsolved' };
const TYPE_LABELS: Record<ProblemType, string> = { CODE: 'Code', WRITTEN: 'Written' };

type Selection<T extends string> = Set<T>;

function toggled<T extends string>(set: Selection<T>, value: T) {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
}

function FilterGroup<T extends string>({ title, labels, selected, onChange }: { title: string; labels: Record<T, string>; selected: Selection<T>; onChange: (s: Selection<T>) => void }) {
  return (
    <fieldset className="border-t border-slate-200 py-4 first:border-t-0 first:pt-0">
      <legend className="float-left mb-2 w-full text-xs font-semibold text-slate-500">{title}</legend>
      <div className="clear-both space-y-2">
        {(Object.keys(labels) as T[]).map((value) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={selected.has(value)} onChange={() => onChange(toggled(selected, value))} />
            {labels[value]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ProblemsPage() {
  const { ready, user } = useAuth();
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Selection<keyof typeof STATUS_LABELS>>(new Set());
  const [difficulty, setDifficulty] = useState<Selection<Difficulty>>(new Set());
  const [category, setCategory] = useState<Selection<Category>>(new Set());
  const [type, setType] = useState<Selection<ProblemType>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!ready) return;
    api<ProblemSummary[]>('/api/problems').then(setProblems).catch((e) => setError(errorMessage(e)));
  }, [ready]);

  const filtered = useMemo(
    () =>
      (problems ?? []).filter(
        (p) =>
          (!status.size || status.has(p.solved ? 'solved' : 'unsolved')) &&
          (!difficulty.size || difficulty.has(p.difficulty)) &&
          (!category.size || category.has(p.category)) &&
          (!type.size || type.has(p.type)) &&
          (!query || `${p.title} ${p.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
      ),
    [problems, status, difficulty, category, type, query]
  );
  const cleared = problems?.filter((p) => p.solved).length ?? 0;
  const filters = (
    <>
      {user && <FilterGroup title="Status" labels={STATUS_LABELS} selected={status} onChange={setStatus} />}
      <FilterGroup title="Difficulty" labels={DIFFICULTY_LABELS} selected={difficulty} onChange={setDifficulty} />
      <FilterGroup title="Type" labels={TYPE_LABELS} selected={type} onChange={setType} />
      <FilterGroup title="Category" labels={CATEGORY_LABELS} selected={category} onChange={setCategory} />
    </>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader title="Practice" subtitle="Every attempt records your AI conversation. Reviewers score how you used it, not only the result." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <DailyCard />
          <ErrorBox message={error} />
          {!problems && !error && <Spinner className="mt-12" />}
          {problems && !filtered.length && <EmptyState title="No challenges match these filters" />}
          {filtered.length > 0 && (
            <ul className="space-y-3">
              {filtered.map((p) => (
                <li key={p.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-5">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-slate-900">
                        <Link href={`/problems/${p.slug}`} className="hover:text-brand-700">{p.title}</Link>
                        {!p.published && <Badge className="ml-2 border-slate-300 bg-slate-100 align-middle text-slate-600">Draft</Badge>}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        <span className={cx('font-medium', DIFFICULTY_TEXT[p.difficulty])}>{DIFFICULTY_LABELS[p.difficulty]}</span>
                        {`, ${CATEGORY_LABELS[p.category]}, ${TYPE_LABELS[p.type]}, Max XP: 100, ${plural(p.submissions, 'attempt')}`}
                      </p>
                      {p.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.tags.slice(0, 4).map((t) => (
                            <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/problems/${p.slug}`}
                      className={cx(
                        'press inline-flex w-40 shrink-0 items-center justify-center gap-1.5 rounded border px-4 py-2 text-sm font-semibold',
                        p.solved ? 'border-brand-600 bg-brand-50 text-brand-700 hover:bg-brand-100' : 'border-brand-600 text-brand-700 hover:bg-brand-600 hover:text-white'
                      )}
                    >
                      {p.solved && <CheckCircle2 className="h-4 w-4" aria-hidden />}
                      {p.solved ? 'Solved' : 'Solve Challenge'}
                      <span className="sr-only">: {p.title}</span>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="order-first space-y-4 lg:order-none">
          {user && problems && (
            <Card className="p-4">
              <p className="flex items-baseline justify-between text-sm font-medium text-slate-900">
                Your progress <span className="font-mono text-slate-600">{cleared}/{problems.length}</span>
              </p>
              <XpBar progress={problems.length ? cleared / problems.length : 0} className="mt-2" />
            </Card>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" aria-hidden />
            <input className={cx(inputClass, 'pl-9')} placeholder="Search challenges or tags" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search challenges" />
          </div>
          <Card className="hidden p-4 lg:block">{filters}</Card>
          <details className="rounded-md border border-slate-200 bg-white p-4 text-sm lg:hidden">
            <summary className="cursor-pointer font-medium text-slate-900">Filters</summary>
            <div className="mt-4">{filters}</div>
          </details>
        </aside>
      </div>
    </main>
  );
}
