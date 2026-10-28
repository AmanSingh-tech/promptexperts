import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { RunResult, TestResult } from '@/lib/types';
import { StatusBadge, cx } from './ui';

const icon = (t: TestResult) =>
  t.verdict === 'PASSED' || t.verdict === 'RAN' ? (
    <CheckCircle2 className="h-4 w-4 text-xp-400" />
  ) : t.verdict === 'TIME_LIMIT' ? (
    <Clock className="h-4 w-4 text-amber-400" />
  ) : (
    <XCircle className="h-4 w-4 text-rose-400" />
  );

const Block = ({ label, value }: { label: string; value?: string | null }) =>
  value == null ? null : (
    <div>
      <p className="mb-1 font-display text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <pre className="max-h-40 overflow-auto rounded-md bg-slate-950 p-2 font-mono text-xs text-slate-200">{value || ' '}</pre>
    </div>
  );

export function TestResults({ result }: { result: RunResult }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StatusBadge value={result.status} />
        {result.tests.length > 0 && result.status !== 'RAN' && (
          <span className="font-mono text-sm text-slate-400">
            {result.tests.filter((t) => t.verdict === 'PASSED').length}/{result.tests.length} tests passed
          </span>
        )}
      </div>
      {result.compileError && <pre className="overflow-auto rounded-md bg-rose-500/10 p-3 font-mono text-xs text-rose-200">{result.compileError}</pre>}
      {result.tests.map((t, i) => (
        <details key={i} open={t.verdict !== 'PASSED'} className="rounded-lg border border-slate-800 bg-slate-900/60">
          <summary className={cx('flex cursor-pointer items-center gap-2 px-3 py-2 font-mono text-sm', t.verdict !== 'PASSED' && 'font-semibold text-white')}>
            {icon(t)} Test {i + 1}
            {t.isSample === false && <span className="text-xs text-slate-400">(hidden)</span>}
          </summary>
          <div className="grid gap-3 border-t border-slate-800 p-3 md:grid-cols-3">
            <Block label="Input" value={t.input} />
            <Block label="Your output" value={t.stdout} />
            <Block label="Expected" value={t.expectedOutput} />
            {t.stderr && <div className="md:col-span-3"><Block label="stderr" value={t.stderr} /></div>}
          </div>
        </details>
      ))}
    </div>
  );
}
