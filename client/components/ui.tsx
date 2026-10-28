import Link from 'next/link';
import { Loader2, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Difficulty, SolveStatus } from '@/lib/types';
import { DIFFICULTY_LABELS, STATUS_LABELS } from '@/lib/format';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const VARIANTS: Record<Variant, string> = {
  primary:
    'chamfer bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-[0_0_24px_-6px_rgb(130_87_255_/_0.7)] hover:from-brand-500 hover:to-brand-400 disabled:opacity-50',
  secondary: 'border border-slate-700 bg-slate-900/60 text-slate-100 hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50',
  ghost: 'text-slate-300 hover:bg-slate-800/80 hover:text-white disabled:opacity-50',
  danger: 'chamfer bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50',
  success:
    'chamfer bg-gradient-to-r from-xp-500 to-xp-400 text-slate-950 shadow-[0_0_24px_-6px_rgb(189_240_67_/_0.6)] hover:from-xp-400 hover:to-xp-300 disabled:opacity-50'
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean };

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'press inline-flex select-none items-center justify-center gap-2 rounded-md font-display font-semibold uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-400 disabled:cursor-not-allowed',
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
        'press inline-flex select-none items-center justify-center gap-2 rounded-md px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-400',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ className, hud, children }: { className?: string; hud?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cx(
        'rounded-xl bg-slate-900/80 shadow-[0_0_0_1px_rgb(160_166_196_/_0.12),0_8px_30px_-12px_rgb(0_0_0_/_0.6)] backdrop-blur-sm',
        hud && 'hud',
        className
      )}
    >
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cx('flex justify-center', className)} role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin text-neon-400" />
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center">
      <p className="font-display font-semibold text-slate-200">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-400">{children}</div>}
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-display text-[11px] font-semibold uppercase tracking-wider', className)}>
      {children}
    </span>
  );
}

const DIFFICULTY: Record<Difficulty, { className: string; icon: typeof Shield }> = {
  EASY: { className: 'border-xp-400/30 bg-xp-400/10 text-xp-300', icon: Shield },
  MEDIUM: { className: 'border-amber-400/30 bg-amber-400/10 text-amber-300', icon: ShieldCheck },
  HARD: { className: 'border-rose-400/30 bg-rose-500/10 text-rose-300', icon: ShieldAlert }
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
      ? 'border-xp-400/30 bg-xp-400/10 text-xp-300'
      : value === 'MANUAL_REVIEW' || value === 'RAN'
        ? 'border-neon-400/30 bg-neon-400/10 text-neon-300'
        : 'border-rose-400/30 bg-rose-500/10 text-rose-300';
  return <Badge className={style}>{STATUS_LABELS[value]}</Badge>;
}

export function scoreTone(value: number) {
  return value >= 75 ? 'text-xp-300' : value >= 50 ? 'text-amber-300' : 'text-rose-300';
}

export function ScorePill({ value, label }: { value: number | null | undefined; label?: string }) {
  if (value == null) return <span className="text-sm text-slate-500">–</span>;
  return (
    <span className={cx('font-mono font-semibold tabular-nums', scoreTone(value))}>
      {value}
      {label && <span className="ml-1 text-xs font-normal text-slate-400">{label}</span>}
    </span>
  );
}

export function PageHeader({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-neon-400">{kicker}</p>}
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 max-w-[65ch] text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-neon-400/60 focus:outline-none focus:ring-2 focus:ring-neon-400/20 sm:text-sm';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-xs font-semibold uppercase tracking-wider text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'press chamfer-sm px-3 py-1 font-display text-xs font-semibold uppercase tracking-wider',
        active ? 'bg-neon-400 text-slate-950' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
      )}
    >
      {children}
    </button>
  );
}
