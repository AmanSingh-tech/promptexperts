// Fixed-window counter kept in memory; use a shared store (e.g. Redis) when running several API instances.
export function createLimiter({ limit, windowMs }) {
  const hits = new Map();
  return {
    blocked(key) {
      const h = hits.get(key);
      if (!h || h.reset < Date.now()) return false;
      return h.count >= limit;
    },
    hit(key) {
      const now = Date.now();
      const h = hits.get(key);
      if (!h || h.reset < now) hits.set(key, { count: 1, reset: now + windowMs });
      else h.count++;
      if (hits.size > 10000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    },
    clear(key) {
      hits.delete(key);
    }
  };
}
