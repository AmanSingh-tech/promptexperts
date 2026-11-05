'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import type { Season } from '@/lib/types';
import { Badge, Button, Card, ErrorBox, Field, cx, inputClass } from './ui';

// <input type="datetime-local"> works in local time without a zone; convert at the edges.
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromNow = (days: number) => toLocalInput(new Date(Date.now() + days * 86400000).toISOString());

const STATE_STYLES: Record<Season['state'], string> = {
  LIVE: 'bg-brand-50 text-brand-800',
  UPCOMING: 'bg-sky-50 text-sky-800',
  ENDED: 'bg-slate-100 text-slate-700'
};
const STATE_LABELS: Record<Season['state'], string> = { LIVE: 'Live', UPCOMING: 'Upcoming', ENDED: 'Ended' };

export function SeasonsAdmin({ seasons, onChange }: { seasons: Season[]; onChange: (s: Season[]) => void }) {
  const [editing, setEditing] = useState<Season | null>(null);
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState(fromNow(0));
  const [endsAt, setEndsAt] = useState(fromNow(90));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function edit(s: Season | null) {
    setEditing(s);
    setName(s?.name ?? '');
    setStartsAt(s ? toLocalInput(s.startsAt) : fromNow(0));
    setEndsAt(s ? toLocalInput(s.endsAt) : fromNow(90));
    setError(null);
  }

  const reload = async () => onChange(await api<Season[]>('/api/seasons'));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { name, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() };
    try {
      if (editing) await api(`/api/seasons/${editing.id}`, { method: 'PATCH', body });
      else await api('/api/seasons', { method: 'POST', body });
      toast.success(editing ? 'Season updated' : 'Season created', { description: name });
      edit(null);
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Season) {
    if (!window.confirm(`Delete the season "${s.name}"? Scores are kept; only its leaderboard and future medals go.`)) return;
    try {
      await api(`/api/seasons/${s.id}`, { method: 'DELETE' });
      if (editing?.id === s.id) edit(null);
      await reload();
      toast.success(`Deleted “${s.name}”`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form onSubmit={save} className="space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900">{editing ? `Edit ${editing.name}` : 'New season'}</h2>
          <p className="text-xs text-slate-600">
            A season ranks players on the XP they earn between its start and end. Seasons can't overlap, and XP and levels never reset.
            The top three on a season board with more than 3 players get a medal once every review from the season is final.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
            <Field label="Starts" hint="Your local time"><input className={inputClass} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required /></Field>
            <Field label="Ends"><input className={inputClass} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required /></Field>
          </div>
          <ErrorBox message={error} />
          <div className="flex justify-end gap-2">
            {editing && <Button type="button" variant="secondary" onClick={() => edit(null)}>Cancel</Button>}
            <Button type="submit" loading={saving}>{editing ? 'Save season' : 'Create season'}</Button>
          </div>
        </form>
      </Card>
      <Card className="divide-y divide-slate-200">
        {!seasons.length && <p className="px-4 py-6 text-sm text-slate-600">No seasons yet.</p>}
        {seasons.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">
                {s.name}
                <Badge className={cx('ml-2', STATE_STYLES[s.state])}>{STATE_LABELS[s.state]}</Badge>
              </p>
              <p className="text-xs text-slate-600">{new Date(s.startsAt).toLocaleString()} → {new Date(s.endsAt).toLocaleString()}</p>
            </div>
            <button onClick={() => edit(s)} aria-label={`Edit ${s.name}`} className="rounded p-1.5 text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove(s)} aria-label={`Delete ${s.name}`} className="rounded p-1.5 text-slate-600 hover:bg-rose-950/40 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </Card>
    </div>
  );
}
