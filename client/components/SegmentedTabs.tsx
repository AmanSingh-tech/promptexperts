'use client';

import { useLayoutEffect, useRef, useState } from 'react';

const PAD = 4;

// Two stacked copies of the tab row; the active-styled copy is clipped to the selected tab,
// so switching animates one clip-path instead of crossfading colors on every button.
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const [clip, setClip] = useState<string | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const el = buttons.current[value];
      const box = container.current;
      if (!el || !box) return;
      // The overlay sits inside the container's 4px padding, so offsets are shifted by that inset.
      const left = el.offsetLeft - PAD;
      const right = box.offsetWidth - (el.offsetLeft + el.offsetWidth) - PAD;
      setClip(`inset(0 ${right}px 0 ${left}px round 6px)`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [value]);

  const row = (active: boolean) =>
    options.map((o) => (
      <button
        key={o.value}
        ref={active ? undefined : (el) => void (buttons.current[o.value] = el)}
        role={active ? undefined : 'tab'}
        aria-selected={active ? undefined : o.value === value}
        tabIndex={active ? -1 : o.value === value ? 0 : -1}
        onClick={() => onChange(o.value)}
        onKeyDown={(e) => {
          if (active || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
          const i = options.findIndex((x) => x.value === value);
          const next = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length];
          onChange(next.value);
          buttons.current[next.value]?.focus();
        }}
        className={
          active
            ? 'px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-slate-950'
            : 'press px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-400'
        }
      >
        {o.label}
      </button>
    ));

  return (
    <div ref={container} className="relative inline-flex rounded-lg bg-slate-900/90 p-1 shadow-[0_0_0_1px_rgb(160_166_196_/_0.12)]">
      <div role="tablist" aria-label={label} className="flex">
        {row(false)}
      </div>
      <div
        aria-hidden
        className="segment-clip pointer-events-none absolute flex rounded-md bg-neon-400"
        style={{ clipPath: clip ?? 'inset(0 100% 0 0)', inset: PAD }}
      >
        {row(true)}
      </div>
    </div>
  );
}
