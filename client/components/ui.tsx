import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { Difficulty, SolveStatus } from '@/lib/types';
import { DIFFICULTY_LABELS, STATUS_LABELS } from '@/lib/format';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md';
  loading?: boolean;
};

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/50'
};

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
        VARIANTS[variant],
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = 'primary', className, children }: { href: string; variant?: keyof typeof VARIANTS; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors', VARIANTS[variant], className)}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cx('rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/70 dark:bg-slate-900', className)}>
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cx('flex justify-center', className)} role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
      {message}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>{children}</span>;
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  EASY: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  HARD: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
};

export const DifficultyBadge = ({ value }: { value: Difficulty }) => (
  <Badge className={DIFFICULTY_STYLES[value]}>{DIFFICULTY_LABELS[value]}</Badge>
);

export function StatusBadge({ value }: { value: SolveStatus | 'RAN' }) {
  const style =
    value === 'ACCEPTED'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
      : value === 'MANUAL_REVIEW' || value === 'RAN'
        ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
  return <Badge className={style}>{STATUS_LABELS[value]}</Badge>;
}

export function ScorePill({ value, label }: { value: number | null | undefined; label?: string }) {
  if (value == null) return <span className="text-sm text-slate-400">–</span>;
  const tone =
    value >= 75 ? 'text-emerald-700 dark:text-emerald-400' : value >= 50 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400';
  return (
    <span className={cx('font-semibold tabular-nums', tone)}>
      {value}
      {label && <span className="ml-1 text-xs font-normal text-slate-500">{label}</span>}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
