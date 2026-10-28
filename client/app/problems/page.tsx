'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Code2, FileText, Search, Users, Zap } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/lib/format';
import { plural } from '@/lib/game';
import type { Category, Difficulty, ProblemSummary, ProblemType } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Chip, DifficultyBadge, EmptyState, ErrorBox, PageHeader, Spinner, cx, inputClass } from '@/components/ui';

const STRIPE: Record<Difficulty, string> = {
  EASY: 'from-xp-400 to-xp-500',
  MEDIUM: 'from-amber-300 to-amber-500',
  HARD: 'from-rose-400 to-rose-600'
};

export default function ProblemsPage() {
  const { ready } = useAuth();
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [type, setType] = useState<ProblemType | ''>('');
  const [query, setQuery] = useState('');
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    if (!ready) return;
    api<ProblemSummary[]>('/api/problems')
      .then((p) => {
        setProblems(p);
        setTimeout(() => setEntering(false), 700);
      })
      .catch((e) => setError(errorMessage(e)));
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
  const cleared = problems?.filter((p) => p.solved).length ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        kicker="Choose your challenge"
        title="The Arena"
        subtitle="Every attempt records your AI conversation. Reviewers score how you used it, not only the result."
        actions={
          problems && (
            <div className="rounded-lg bg-slate-900/80 px-4 py-2 text-right shadow-[0_0_0_1px_rgb(160_166_196_/_0.12)]">
              <p className="font-mono text-xl font-semibold tabular-nums text-white">
                {cleared}<span className="text-slate-500">/{problems.length}</span>
              </p>
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cleared</p>
            </div>
          )
        }
      />

      <div className="mb-6 space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input className={cx(inputClass, 'pl-9')} placeholder="Search challenges or tags" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search challenges" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={!difficulty} onClick={() => setDifficulty('')}>All levels</Chip>
          {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>{DIFFICULTY_LABELS[d]}</Chip>
          ))}
          <span className="mx-1 w-px bg-slate-800" />
          <Chip active={!type} onClick={() => setType('')}>All types</Chip>
          <Chip active={type === 'CODE'} onClick={() => setType('CODE')}>Code</Chip>
          <Chip active={type === 'WRITTEN'} onClick={() => setType('WRITTEN')}>Written</Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={!category} onClick={() => setCategory('')}>All categories</Chip>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{CATEGORY_LABELS[c]}</Chip>
          ))}
        </div>
      </div>

      <ErrorBox message={error} />
      {!problems && !error && <Spinner className="mt-12" />}
      {problems && !filtered.length && <EmptyState title="No challenges match these filters" />}

      {filtered.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <li key={p.id} className={cx(entering && 'animate-rise')} style={entering ? { animationDelay: `${Math.min(i, 8) * 40}ms` } : undefined}>
              <Link
                href={`/problems/${p.slug}`}
                className="press group relative flex h-full flex-col overflow-hidden rounded-xl bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgb(160_166_196_/_0.12)] hover:bg-slate-900 hover:shadow-[0_0_0_1px_rgb(63_227_242_/_0.45),0_0_32px_-12px_rgb(63_227_242_/_0.6)]"
              >
                <span className={cx('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', STRIPE[p.difficulty])} aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <DifficultyBadge value={p.difficulty} />
                  {p.solved ? (
                    <Badge className="border-xp-400/30 bg-xp-400/10 text-xp-300"><CheckCircle2 className="h-3 w-3" /> Cleared</Badge>
                  ) : (
                    !p.published && <Badge className="border-slate-600 bg-slate-800 text-slate-300">Draft</Badge>
                  )}
                </div>
                <h2 className="mt-4 font-display text-xl font-bold uppercase leading-tight text-white">{p.title}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                  {p.type === 'CODE' ? <Code2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                  {CATEGORY_LABELS[p.category]} · {p.type === 'CODE' ? 'Code' : 'Written'}
                </p>
                {p.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">#{t}</span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-4 text-sm">
                  <span className="flex items-center gap-1 font-display font-semibold uppercase tracking-wide text-xp-300">
                    <Zap className="h-4 w-4" /> Up to 100 XP
                  </span>
                  <span className="flex items-center gap-1 text-slate-400"><Users className="h-3.5 w-3.5" /> {plural(p.submissions, 'attempt')}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
