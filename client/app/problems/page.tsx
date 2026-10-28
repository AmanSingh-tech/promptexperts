'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileText, Code2, Search } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/lib/format';
import type { Category, Difficulty, ProblemSummary, ProblemType } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Card, DifficultyBadge, EmptyState, ErrorBox, PageHeader, Spinner, cx, inputClass } from '@/components/ui';

export default function ProblemsPage() {
  const { ready } = useAuth();
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [type, setType] = useState<ProblemType | ''>('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!ready) return;
    api<ProblemSummary[]>('/api/problems').then(setProblems).catch((e) => setError(errorMessage(e)));
  }, [ready]);

  const filtered = useMemo(
    () =>
      (problems ?? []).filter(
        (p) =>
          (!difficulty || p.difficulty === difficulty) &&
          (!category || p.category === category) &&
          (!type || p.type === type) &&
          (!query || `${p.title} ${p.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
      ),
    [problems, difficulty, category, type, query]
  );

  const chip = (active: boolean) =>
    cx(
      'rounded-full border px-3 py-1 text-sm',
      active
        ? 'border-brand-600 bg-brand-600 text-white'
        : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Problems"
        subtitle="Every attempt records your AI conversation. Reviewers score how you used it, not only the result."
      />
      <div className="mb-5 space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className={cx(inputClass, 'pl-9')} placeholder="Search by title or tag" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search problems" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={chip(!difficulty)} onClick={() => setDifficulty('')}>All levels</button>
          {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
            <button key={d} className={chip(difficulty === d)} onClick={() => setDifficulty(d)}>{DIFFICULTY_LABELS[d]}</button>
          ))}
          <span className="mx-1 w-px bg-slate-200 dark:bg-slate-700" />
          <button className={chip(!type)} onClick={() => setType('')}>All types</button>
          <button className={chip(type === 'CODE')} onClick={() => setType('CODE')}>Code</button>
          <button className={chip(type === 'WRITTEN')} onClick={() => setType('WRITTEN')}>Written</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={chip(!category)} onClick={() => setCategory('')}>All categories</button>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
            <button key={c} className={chip(category === c)} onClick={() => setCategory(c)}>{CATEGORY_LABELS[c]}</button>
          ))}
        </div>
      </div>

      <ErrorBox message={error} />
      {!problems && !error && <Spinner className="mt-12" />}
      {problems && !filtered.length && <EmptyState title="No problems match these filters" />}

      {filtered.length > 0 && (
        <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
          {filtered.map((p) => (
            <Link key={p.id} href={`/problems/${p.slug}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <span className="w-5 shrink-0" aria-label={p.solved ? 'Solved' : undefined}>
                {p.solved && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              </span>
              <span className="shrink-0 text-slate-400" title={p.type === 'CODE' ? 'Code problem' : 'Written answer'}>
                {p.type === 'CODE' ? <Code2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.title}
                  {!p.published && <Badge className="ml-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">Draft</Badge>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {CATEGORY_LABELS[p.category]}
                  {p.tags.length > 0 && ` · ${p.tags.join(', ')}`}
                </p>
              </div>
              <span className="hidden text-xs text-slate-500 sm:block">{p.submissions} submissions</span>
              <DifficultyBadge value={p.difficulty} />
            </Link>
          ))}
        </Card>
      )}
    </main>
  );
}
