import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cx } from './ui';

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cx(
        'prose prose-sm prose-invert max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:tracking-wide prose-a:text-neon-300 prose-strong:text-white prose-code:text-neon-300 prose-pre:bg-[#0b0c15] prose-pre:text-slate-100 prose-pre:shadow-[inset_0_0_0_1px_rgb(160_166_196_/_0.1)] prose-code:before:content-none prose-code:after:content-none',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
