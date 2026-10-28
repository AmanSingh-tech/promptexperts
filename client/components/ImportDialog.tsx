'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import type { AISession } from '@/lib/types';
import { Button, ErrorBox, Field, inputClass } from './ui';

const TOOLS = ['ChatGPT', 'Claude.ai', 'Gemini', 'GitHub Copilot', 'Cursor', 'Other'];

const EXAMPLE = `User: I think this needs a sliding window. Does that work when characters repeat?
ChatGPT: Yes. Keep a map of each character's last index and move the left edge past it...
User: What edge cases should I test?
ChatGPT: Empty-ish input, all-same characters like "bbbb", and "abba"...`;

export function ImportDialog({ sessionId, onClose, onImported }: { sessionId: string; onClose: () => void; onImported: (s: AISession) => void }) {
  const [tool, setTool] = useState(TOOLS[0]);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ imported: number; session: AISession }>(`/api/sessions/${sessionId}/import`, {
        method: 'POST',
        body: { tool, transcript }
      });
      onImported(res.session);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="modal-panel hud w-full max-w-2xl rounded-xl bg-slate-900 p-6 shadow-[0_0_0_1px_rgb(160_166_196_/_0.15),0_24px_80px_-20px_rgb(0_0_0_/_0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="import-title" className="font-display text-xl font-bold uppercase text-white">Import external AI log</h2>
            <p className="mt-1 text-sm text-slate-400">
              Paste the full conversation. Label each turn (<code>User:</code>, <code>ChatGPT:</code>, <code>Claude:</code>…) or paste a
              JSON export such as ChatGPT&apos;s <code>conversations.json</code> entry. Imported messages are marked as such for reviewers.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="press rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 space-y-4">
          <ErrorBox message={error} />
          <Field label="Tool">
            <select className={inputClass} value={tool} onChange={(e) => setTool(e.target.value)}>
              {TOOLS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Transcript">
            <textarea className={`${inputClass} h-64 font-mono text-xs`} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder={EXAMPLE} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={loading} disabled={!transcript.trim()}>Import</Button>
        </div>
      </div>
    </div>
  );
}
