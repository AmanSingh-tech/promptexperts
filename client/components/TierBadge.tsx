import { Gem } from 'lucide-react';
import type { Tier } from '@/lib/game';
import { Badge, cx } from './ui';

export function TierBadge({ tier }: { tier: Tier | null }) {
  if (!tier) return <Badge className="border-slate-700 bg-slate-800/60 text-slate-400">Unranked</Badge>;
  return (
    <Badge className={cx(tier.className)}>
      <Gem className="h-3 w-3" aria-hidden /> {tier.name}
    </Badge>
  );
}
