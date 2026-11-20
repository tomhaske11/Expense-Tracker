import 'server-only';
import { hasRedis, redisPipeline } from '@/lib/redis';

/*
 * A small shared cache for data every user sees the same way (market prices, news, Claude's
 * news notes). In production it lives in Upstash Redis, so one fetch serves every serverless
 * instance and every user; without Redis (local development) it's in memory.
 *
 * Entries carry the time they were stored. `cached()` returns a fresh entry as-is, refetches a
 * stale one, and falls back to the stale copy if the refetch fails, so a provider outage or a
 * rate limit shows slightly old data instead of nothing.
 */

interface Entry<T> {
  at: number;
  value: T;
}

const memory = new Map<string, { entry: Entry<unknown>; expires: number }>();

async function read<T>(key: string): Promise<Entry<T> | null> {
  if (!hasRedis()) {
    const hit = memory.get(key);
    return hit && hit.expires > Date.now() ? (hit.entry as Entry<T>) : null;
  }
  try {
    const [r] = await redisPipeline([['GET', key]]);
    return typeof r?.result === 'string' ? (JSON.parse(r.result) as Entry<T>) : null;
  } catch (error) {
    console.error('Cache read failed:', error);
    return null;
  }
}

async function write<T>(key: string, value: T, keepMs: number): Promise<void> {
  const entry: Entry<T> = { at: Date.now(), value };
  if (!hasRedis()) {
    if (memory.size > 2000) for (const [k, v] of memory) if (v.expires <= Date.now()) memory.delete(k);
    memory.set(key, { entry, expires: Date.now() + keepMs });
    return;
  }
  try {
    await redisPipeline([['SET', key, JSON.stringify(entry), 'PX', String(keepMs)]]);
  } catch (error) {
    console.error('Cache write failed:', error);
  }
}

/** The stored value if it's younger than `freshMs`, else null. */
export async function cacheGet<T>(key: string, freshMs: number): Promise<T | null> {
  const entry = await read<T>(key);
  return entry && Date.now() - entry.at < freshMs ? entry.value : null;
}

/** Store a value, kept for `keepMs`. */
export const cacheSet = <T>(key: string, value: T, keepMs: number) => write(key, value, keepMs);

/**
 * Return the cached value if fresh; otherwise run `load` and store the result. If `load` throws
 * and a stale copy exists (kept up to `keepMs`), return that instead.
 */
export async function cached<T>(key: string, { freshMs, keepMs }: { freshMs: number; keepMs: number }, load: () => Promise<T>): Promise<T> {
  const entry = await read<T>(key);
  if (entry && Date.now() - entry.at < freshMs) return entry.value;
  try {
    const value = await load();
    await write(key, value, keepMs);
    return value;
  } catch (error) {
    if (entry) return entry.value;
    throw error;
  }
}
