'use client';

import { useState } from 'react';
import type { Submission } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/format';
import { Markdown } from './Markdown';
import { Transcript } from './ChatPanel';
import { TestResults } from './TestResults';
import { Card, EmptyState, cx } from './ui';

type Tab = 'answer' | 'tests' | 'ai';

export function SubmissionTabs({ submission, defaultTab = 'answer' }: { submission: Submission; defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const isCode = submission.problem.type === 'CODE';
  const logs = submission.aiSession?.logs ?? [];
  const tabs: { id: Tab; label: string }[] = [
    { id: 'answer', label: isCode ? `Code · ${LANGUAGE_LABELS[submission.language] ?? submission.language}` : 'Answer' },
    ...(isCode ? [{ id: 'tests' as Tab, label: `Tests · ${submission.passedCount}/${submission.totalCount}` }] : []),
    { id: 'ai', label: `AI transcript · ${logs.length}` }
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2 dark:border-slate-800" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium',
              tab === t.id ? 'border-brand-600 text-brand-700 dark:text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === 'answer' &&
          (isCode ? (
            <pre className="max-h-[70vh] overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">{submission.code}</pre>
          ) : (
            <Markdown>{submission.code}</Markdown>
          ))}
        {tab === 'tests' &&
          (submission.results ? (
            <TestResults result={{ status: submission.status, compileError: submission.results.compileError ?? undefined, tests: submission.results.tests }} />
          ) : (
            <EmptyState title="No test results" />
          ))}
        {tab === 'ai' &&
          (logs.length ? (
            <div className="max-h-[70vh] overflow-y-auto">
              <Transcript logs={logs} />
            </div>
          ) : (
            <EmptyState title="No AI conversation was recorded for this attempt" />
          ))}
      </div>
    </Card>
  );
}
