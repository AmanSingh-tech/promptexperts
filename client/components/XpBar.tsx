import { cx } from './ui';

// Scales a full-width bar instead of animating width, so it stays on the compositor.
export function XpBar({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-slate-800', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="XP to next level">
      <div
        className="h-full origin-left rounded-full bg-gradient-to-r from-neon-400 to-xp-400 transition-transform duration-500 ease-out"
        style={{ transform: `scaleX(${Math.max(0.02, progress)})` }}
      />
    </div>
  );
}
