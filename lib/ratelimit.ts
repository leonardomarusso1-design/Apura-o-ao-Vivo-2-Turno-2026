import { redis } from "./redis";

const mem = new Map<string, { n: number; reset: number }>();

/** true = bloqueado. Usa Redis (global) com fallback em memória (por instância). */
export async function limited(key: string, max: number, windowSec: number): Promise<boolean> {
  const r = await redis<number>([
    "EVAL",
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
    1,
    `rl:${key}`,
    windowSec,
  ]);
  if (typeof r === "number") return r > max;

  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || cur.reset < now) {
    mem.set(key, { n: 1, reset: now + windowSec * 1000 });
    if (mem.size > 5000) for (const [k, v] of mem) if (v.reset < now) mem.delete(k);
    return false;
  }
  cur.n += 1;
  return cur.n > max;
}
