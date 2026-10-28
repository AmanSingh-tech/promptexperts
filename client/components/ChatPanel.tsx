'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Import, Send, User as UserIcon } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import type { AILog, AISession } from '@/lib/types';
import { Markdown } from './Markdown';
import { ImportDialog } from './ImportDialog';
import { Badge, Button, ErrorBox, cx } from './ui';

export function Transcript({ logs, pending }: { logs: AILog[]; pending?: string | null }) {
  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Message key={log.id} log={log} />
      ))}
      {pending && (
        <>
          <Message log={{ id: 'pending', role: 'USER', content: pending, source: 'PLATFORM', tool: null, timestamp: '' }} />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Bot className="h-4 w-4 animate-pulse" /> Claude is thinking…
          </div>
        </>
      )}
    </div>
  );
}

function Message({ log }: { log: AILog }) {
  const mine = log.role === 'USER';
  return (
    <div className={cx('flex gap-2', mine && 'flex-row-reverse')}>
      <span
        className={cx(
          'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
          mine ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
        )}
        aria-hidden
      >
        {mine ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div className={cx('min-w-0 max-w-[85%] space-y-1', mine && 'text-right')}>
        {log.source === 'IMPORTED' && (
          <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">Imported · {log.tool}</Badge>
        )}
        <div
          className={cx(
            'rounded-2xl px-3.5 py-2.5 text-left',
            mine ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
          )}
        >
          {mine ? <p className="whitespace-pre-wrap break-words text-sm">{log.content}</p> : <Markdown>{log.content}</Markdown>}
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({ session, onSession }: { session: AISession; onSession: (s: AISession) => void }) {
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const active = session.status === 'ACTIVE';

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session.logs.length, pending]);

  async function send() {
    const message = input.trim();
    if (!message || pending) return;
    setPending(message);
    setInput('');
    setError(null);
    try {
      const res = await api<{ userLog: AILog; assistantLog: AILog }>(`/api/sessions/${session.id}/messages`, {
        method: 'POST',
        body: { message }
      });
      onSession({ ...session, totalMessages: session.totalMessages + 2, logs: [...session.logs, res.userLog, res.assistantLog] });
    } catch (err) {
      setError(errorMessage(err));
      setInput(message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold">AI assistant</h2>
          <p className="text-xs text-slate-500">Everything here is recorded and reviewed</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)} disabled={!active} title="Import a conversation from another AI tool">
          <Import className="h-4 w-4" /> Import
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {session.logs.length === 0 && !pending ? (
          <div className="mx-auto mt-8 max-w-xs text-center text-sm text-slate-500">
            <Bot className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="font-medium text-slate-700 dark:text-slate-200">Ask Claude anything about this problem.</p>
            <p className="mt-2">
              Reviewers reward specific questions, your own reasoning, and using AI to test and compare ideas. Used another
              tool? Import that conversation too.
            </p>
          </div>
        ) : (
          <Transcript logs={session.logs} pending={pending} />
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <ErrorBox message={error} />
        <div className={cx('flex items-end gap-2', error && 'mt-2')}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={Math.min(6, Math.max(2, input.split('\n').length))}
            disabled={!active}
            placeholder={active ? 'Ask a question. Enter to send, Shift+Enter for a new line.' : 'This attempt has been submitted.'}
            aria-label="Message the AI assistant"
            className="min-h-[2.5rem] flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-800"
          />
          <Button onClick={send} loading={!!pending} disabled={!active || !input.trim()} aria-label="Send message">
            {!pending && <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {importOpen && <ImportDialog sessionId={session.id} onClose={() => setImportOpen(false)} onImported={onSession} />}
    </div>
  );
}
