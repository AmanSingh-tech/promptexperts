'use client';

import { useEffect, useState } from 'react';

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hms = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  return d ? `${d}d ${hms}` : hms;
}

// Ticks once a second; numbers swap without animation so the readout stays steady.
export function Countdown({ to, onDone, className }: { to: string; onDone?: () => void; className?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= target) {
        clearInterval(id);
        onDone?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, onDone]);
  return (
    <time dateTime={to} className={className ?? 'font-mono tabular-nums'}>
      {format(target - now)}
    </time>
  );
}
