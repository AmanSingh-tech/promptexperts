import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cx } from './ui';

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cx(
        'prose prose-sm max-w-none dark:prose-invert prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-code:before:content-none prose-code:after:content-none',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
