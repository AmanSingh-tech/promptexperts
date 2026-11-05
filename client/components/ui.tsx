import Link from 'next/link';
import { Loader2, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Difficulty, SolveStatus } from '@/lib/types';
import { DIFFICULTY_LABELS, STATUS_LABELS } from '@/lib/format';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50',
  danger: 'bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-50',
  success: 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50'
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean };

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'press inline-flex select-none items-center justify-center gap-2 rounded-md font-display font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        VARIANTS[variant],
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = 'primary', className, children }: { href: string; variant?: Variant; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        'press inline-flex select-none items-center justify-center gap-2 rounded-md px-4 py-2 font-display text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx('rounded-md border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cx('flex justify-center', className)} role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 px-6 py-12 text-center">
      <p className="font-display font-semibold text-slate-800">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium', className)}>
      {children}
    </span>
  );
}

const DIFFICULTY: Record<Difficulty, { className: string; icon: typeof Shield }> = {
  EASY: { className: 'border-brand-200 bg-brand-50 text-brand-700', icon: Shield },
  MEDIUM: { className: 'border-amber-300 bg-amber-50 text-amber-800', icon: ShieldCheck },
  HARD: { className: 'border-rose-300 bg-rose-50 text-rose-700', icon: ShieldAlert }
};

export function DifficultyBadge({ value }: { value: Difficulty }) {
  const { className, icon: Icon } = DIFFICULTY[value];
  return (
    <Badge className={className}>
      <Icon className="h-3 w-3" aria-hidden />
      {DIFFICULTY_LABELS[value]}
    </Badge>
  );
}

export function StatusBadge({ value }: { value: SolveStatus | 'RAN' }) {
  const style =
    value === 'ACCEPTED'
      ? 'border-brand-500/30 bg-brand-500/10 text-brand-700'
      : value === 'MANUAL_REVIEW' || value === 'RAN'
        ? 'border-brand-500/30 bg-brand-500/10 text-brand-700'
        : 'border-rose-400/30 bg-rose-500/10 text-rose-700';
  return <Badge className={style}>{STATUS_LABELS[value]}</Badge>;
}

export function scoreTone(value: number) {
  return value >= 75 ? 'text-brand-700' : value >= 50 ? 'text-amber-700' : 'text-rose-700';
}

export function ScorePill({ value, label }: { value: number | null | undefined; label?: string }) {
  if (value == null) return <span className="text-sm text-slate-500">–</span>;
  return (
    <span className={cx('font-mono font-semibold tabular-nums', scoreTone(value))}>
      {value}
      {label && <span className="ml-1 text-xs font-normal text-slate-600">{label}</span>}
    </span>
  );
}

export function PageHeader({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <p className="text-sm text-slate-500">{kicker}</p>}
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-[65ch] text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-600">{hint}</span>}
    </label>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'press rounded-full border px-3 py-1 text-sm font-medium',
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
      )}
    >
      {children}
    </button>
  );
}
