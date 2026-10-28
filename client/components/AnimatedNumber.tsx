'use client';

import NumberFlow from '@number-flow/react';
import { useEffect, useState } from 'react';

// Counts up from 0 once on mount; NumberFlow honours prefers-reduced-motion on its own.
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <NumberFlow value={shown} className={className} willChange />;
}
