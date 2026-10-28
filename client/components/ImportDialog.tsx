'use client';

import { useEffect, useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import type { AISession } from '@/lib/types';
import { Button, ErrorBox, Field, cx, inputClass } from './ui';

const TOOLS = ['ChatGPT', 'Claude.ai', 'Gemini', 'GitHub Copilot', 'Cursor', 'Other'];
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TRANSCRIPT_CHARS = 200000;

const EXAMPLE = `User: I think this needs a sliding window. Does that work when characters repeat?
ChatGPT: Yes. Keep a map of each character's last index and move the left edge past it...
User: What edge cases should I test?
ChatGPT: Empty-ish input, all-same characters like "bbbb", and "abba"...`;

interface ExportConversation {
  title?: string;
  name?: string;
  create_time?: number;
  created_at?: string;
  mapping?: unknown;
  chat_messages?: unknown[];
}

const isConversation = (x: unknown): x is ExportConversation =>
  !!x && typeof x === 'object' && ('mapping' in x || 'chat_messages' in x);

function conversationLabel(c: ExportConversation, i: number) {
  const title = c.title || c.name || `Conversation ${i + 1}`;
  const when = c.create_time ? new Date(c.create_time * 1000) : c.created_at ? new Date(c.created_at) : null;
  return when && !Number.isNaN(when.getTime()) ? `${title} · ${when.toLocaleDateString()}` : title;
}

const toolFor = (c: ExportConversation) => ('chat_messages' in c ? 'Claude.ai' : 'ChatGPT');

export function ImportDialog({ sessionId, onClose, onImported }: { sessionId: string; onClose: () => void; onImported: (s: AISession) => void }) {
  const [tool, setTool] = useState(TOOLS[0]);
  const [transcript, setTranscript] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ExportConversation[] | null>(null);
  const [picked, setPicked] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function selectConversation(list: ExportConversation[], index: number) {
    setPicked(index);
    setTool(toolFor(list[index]));
    setTranscript(JSON.stringify(list[index]));
  }

  async function loadFile(file: File) {
    setError(null);
    setConversations(null);
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is larger than 50 MB.');
      return;
    }
    if (!/\.(txt|md|markdown|json)$/i.test(file.name)) {
      setError('Upload a .txt, .md or .json file.');
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    if (/\.json$/i.test(file.name)) {
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        setError('That JSON file could not be read.');
        return;
      }
      const list = Array.isArray(data) ? data.filter(isConversation) : isConversation(data) ? [data] : [];
      if (list.length) {
        setConversations(list);
        selectConversation(list, 0);
        return;
      }
    }
    setTranscript(text);
  }

  async function submit() {
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      setError(`This conversation is too long (${transcript.length.toLocaleString()} characters; the limit is ${MAX_TRANSCRIPT_CHARS.toLocaleString()}).`);
      return;
    }
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
        className="modal-panel hud max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl bg-slate-900 p-6 shadow-[0_0_0_1px_rgb(160_166_196_/_0.15),0_24px_80px_-20px_rgb(0_0_0_/_0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="import-title" className="font-display text-xl font-bold uppercase text-white">Import external AI log</h2>
            <p className="mt-1 text-sm text-slate-400">
              Upload an export file or paste the conversation. Imported messages are marked as such for reviewers.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="press rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 space-y-4">
          <ErrorBox message={error} />

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) loadFile(file);
            }}
            className={cx(
              'press flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center',
              dragging ? 'border-neon-400 bg-neon-400/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
            )}
          >
            <FileUp className="h-6 w-6 text-neon-400" aria-hidden />
            <span className="font-display text-sm font-bold uppercase tracking-wider text-white">
              {fileName ? `Loaded ${fileName}` : 'Drop a file or browse'}
            </span>
            <span className="text-xs text-slate-400">
              ChatGPT or Claude.ai export (<code>conversations.json</code>), or any .txt / .md transcript
            </span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,.markdown,.json,text/plain,text/markdown,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFile(file);
              e.target.value = '';
            }}
          />

          {conversations && conversations.length > 1 && (
            <Field label={`Conversation (${conversations.length} in this export)`}>
              <select className={inputClass} value={picked} onChange={(e) => selectConversation(conversations, Number(e.target.value))}>
                {conversations.map((c, i) => <option key={i} value={i}>{conversationLabel(c, i)}</option>)}
              </select>
            </Field>
          )}

          <Field label="Tool">
            <select className={inputClass} value={tool} onChange={(e) => setTool(e.target.value)}>
              {TOOLS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>

          {conversations ? (
            <p className="rounded-lg bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
              Ready to import <strong className="text-white">{conversationLabel(conversations[picked], picked)}</strong>.
            </p>
          ) : (
            <Field label="Transcript" hint={'Label each turn ("User:", "ChatGPT:", "Claude:"…) when pasting plain text.'}>
              <textarea
                className={`${inputClass} h-56 font-mono text-xs`}
                value={transcript}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  setFileName(null);
                }}
                placeholder={EXAMPLE}
              />
            </Field>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={loading} disabled={!transcript.trim()}>Import</Button>
        </div>
      </div>
    </div>
  );
}
