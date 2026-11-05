import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cx } from './ui';

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cx(
        'prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-a:text-brand-700 prose-strong:text-slate-900 prose-code:text-slate-900 prose-pre:border prose-pre:border-slate-200 prose-pre:bg-slate-50 prose-pre:text-slate-900 prose-code:before:content-none prose-code:after:content-none',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
