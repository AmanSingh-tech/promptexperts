'use client';

import { useMemo, useState } from 'react';
import { ClipboardPaste, Play, Send } from 'lucide-react';
import { diffLines } from '@/lib/diff';
import { STATUS_LABELS } from '@/lib/format';
import type { SessionEvent } from '@/lib/types';
import { cx } from './ui';

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function verdictLabel(v: string | null) {
  if (!v) return '';
  if (v === 'CUSTOM_INPUT') return 'Custom input';
  return STATUS_LABELS[v as keyof typeof STATUS_LABELS] ?? v;
}

export function CodeHistory({ events }: { events: SessionEvent[] }) {
  const snapshots = events.filter((e) => e.code != null);
  const [selected, setSelected] = useState(Math.max(0, snapshots.length - 1));
  const current = snapshots[selected];
  const previous = selected > 0 ? snapshots[selected - 1] : null;

  const diff = useMemo(() => (current ? diffLines(previous?.code ?? '', current.code ?? '') : []), [current, previous]);
  const added = diff.filter((d) => d.kind === 'add').length;
  const removed = diff.filter((d) => d.kind === 'del').length;

  return (
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <ol className="max-h-[60vh] space-y-1 overflow-y-auto pr-1" aria-label="Timeline">
        {events.map((e) => {
          const snapIndex = snapshots.indexOf(e);
          const isSnap = snapIndex >= 0;
          const Icon = e.type === 'RUN' ? Play : e.type === 'SUBMIT' ? Send : ClipboardPaste;
          return (
            <li key={e.id}>
              <button
                disabled={!isSnap}
                onClick={() => isSnap && setSelected(snapIndex)}
                className={cx(
                  'press flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-xs',
                  isSnap && snapIndex === selected ? 'bg-brand-500/10' : isSnap ? 'hover:bg-slate-100' : 'cursor-default'
                )}
              >
                <Icon className={cx('mt-0.5 h-3.5 w-3.5 shrink-0', e.type === 'PASTE' ? ((e.lines ?? 0) >= 8 ? 'text-amber-700' : 'text-slate-500') : 'text-brand-700')} aria-hidden />
                <span className="min-w-0">
                  <span className="block font-display font-bold text-slate-800">
                    {e.type === 'PASTE' ? `Paste · ${e.lines} lines` : e.type === 'RUN' ? 'Run' : 'Submit'}
                  </span>
                  <span className="block font-mono text-slate-500">
                    {time(e.createdAt)}
                    {e.verdict && ` · ${verdictLabel(e.verdict)}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="min-w-0">
        {current ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-display font-bold text-slate-700">
                Snapshot {selected + 1} of {snapshots.length} · {time(current.createdAt)}
              </span>
              <span className="font-mono">
                <span className="text-brand-700">+{added}</span> <span className="text-rose-700">−{removed}</span>
                <span className="text-slate-500">{previous ? ' vs previous' : ' (first snapshot)'}</span>
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={snapshots.length - 1}
              value={selected}
              onChange={(e) => setSelected(Number(e.target.value))}
              aria-label="Scrub through snapshots"
              className="mb-3 w-full accent-brand-600"
              disabled={snapshots.length < 2}
            />
            <pre className="max-h-[55vh] overflow-auto rounded-md border border-slate-200 bg-white py-3 font-mono text-xs leading-relaxed">
              {diff.map((d, i) => (
                <div
                  key={i}
                  className={cx(
                    'px-4',
                    d.kind === 'add' && 'bg-brand-500/10 text-brand-700',
                    d.kind === 'del' && 'bg-rose-500/10 text-rose-700 line-through decoration-rose-400/40',
                    d.kind === 'same' && 'text-slate-700'
                  )}
                >
                  <span className="mr-3 select-none text-slate-400">{d.kind === 'add' ? '+' : d.kind === 'del' ? '−' : ' '}</span>
                  {d.text || ' '}
                </div>
              ))}
            </pre>
          </>
        ) : (
          <p className="text-sm text-slate-600">No code snapshots were recorded for this attempt.</p>
        )}
      </div>
    </div>
  );
}
