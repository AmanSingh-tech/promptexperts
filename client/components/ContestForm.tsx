'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import type { ContestDetail, ProblemSummary } from '@/lib/types';
import { Badge, Button, Card, DifficultyBadge, ErrorBox, Field, inputClass } from './ui';

// <input type="datetime-local"> works in local time without a zone; convert at the edges.
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const inHours = (h: number) => toLocalInput(new Date(Date.now() + h * 3600000).toISOString());

export function ContestForm({ initial }: { initial?: ContestDetail }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [startsAt, setStartsAt] = useState(initial ? toLocalInput(initial.startsAt) : inHours(24));
  const [endsAt, setEndsAt] = useState(initial ? toLocalInput(initial.endsAt) : inHours(26));
  const [published, setPublished] = useState(initial?.published ?? true);
  const [selected, setSelected] = useState<string[]>(initial?.problems.map((p) => p.id) ?? []);
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<ProblemSummary[]>('/api/problems').then(setProblems).catch((e) => setError(errorMessage(e)));
  }, []);

  const byId = new Map(problems.map((p) => [p.id, p]));
  const move = (i: number, d: number) => {
    const next = [...selected];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setSelected(next);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      title,
      description,
      published,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      problemIds: selected
    };
    try {
      if (initial) await api(`/api/contests/${initial.id}`, { method: 'PATCH', body });
      else await api('/api/contests', { method: 'POST', body });
      toast.success(initial ? 'Contest updated' : 'Contest created', { description: title });
      router.push('/admin?tab=contests');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card className="space-y-4 p-5">
        <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
        <Field label="Description (Markdown)">
          <textarea className={`${inputClass} h-28`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Starts" hint="Your local time"><input className={inputClass} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required /></Field>
          <Field label="Ends"><input className={inputClass} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required /></Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published
          </label>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold uppercase text-white">Contest set ({selected.length})</h2>
          <p className="mb-3 text-xs text-slate-400">Unpublished challenges stay hidden until the contest starts.</p>
          {selected.length === 0 && <p className="text-sm text-slate-400">Pick challenges from the list.</p>}
          <ol className="space-y-2">
            {selected.map((id, i) => {
              const p = byId.get(id);
              return (
                <li key={id} className="flex items-center gap-2 rounded-lg bg-slate-950/60 px-3 py-2 text-sm">
                  <span className="font-display font-bold text-neon-300">{String.fromCharCode(65 + i)}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-100">{p?.title ?? id}</span>
                  {p && !p.published && <Badge className="border-slate-600 bg-slate-800 text-slate-300">Hidden</Badge>}
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="press rounded p-1 text-slate-400 hover:text-white disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="Move down" disabled={i === selected.length - 1} onClick={() => move(i, 1)} className="press rounded p-1 text-slate-400 hover:text-white disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" aria-label="Remove" onClick={() => setSelected(selected.filter((x) => x !== id))} className="press rounded p-1 text-slate-400 hover:text-rose-300"><X className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ol>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase text-white">All challenges</h2>
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {problems.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-slate-800/60">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id))}
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-200">{p.title}</span>
                  {!p.published && <Badge className="border-slate-600 bg-slate-800 text-slate-300">Hidden</Badge>}
                  <DifficultyBadge value={p.difficulty} />
                </label>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ErrorBox message={error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push('/admin?tab=contests')}>Cancel</Button>
        <Button type="submit" loading={saving} disabled={!selected.length}>{initial ? 'Save contest' : 'Create contest'}</Button>
      </div>
    </form>
  );
}
