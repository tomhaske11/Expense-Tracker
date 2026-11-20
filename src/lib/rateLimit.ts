import 'server-only';
import { hasRedis, redisPipeline } from '@/lib/redis';

/*
 * Rate limits for the routes that spend the Anthropic API key or the market-data quota.
 *
 * In production the counters live in Upstash Redis, shared by every Vercel function instance
 * (instances start and stop constantly, so in-memory counters would neither be shared nor
 * survive). Without Redis credentials (local development) an in-memory store is used.
 *
 * Fixed windows: one counter per client and window (e.g. per minute), created with INCR and
 * expired with PEXPIRE, all limits checked in one Redis round trip. A burst at a window
 * boundary can briefly allow up to 2x the limit; the app-wide daily cap still bounds spend.
 *
 * Clients are keyed by user id when known (signed-in API calls), otherwise by the first
 * x-forwarded-for address.
 */

interface Limit {
  /** Max requests per window. */
  max: number;
  windowMs: number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const LIMITS = {
  /** Every route that calls Claude, per client. */
  claudePerMinute: { max: 30, windowMs: MINUTE },
  claudePerDay: { max: 500, windowMs: DAY },
  /** Every route that calls Claude, all clients combined. */
  claudeGlobalPerDay: { max: 1500, windowMs: DAY },
  /** Market data routes, per client (protects the shared market-data quota). */
  marketPerMinute: { max: 120, windowMs: MINUTE },
} satisfies Record<string, Limit>;

type LimitName = keyof typeof LIMITS;
interface Check {
  key: string;
  limit: Limit;
  windowEnd: number;
}

// ---------- Stores ----------

/** Increment each key and return the new counts, in order. */
type CounterStore = (checks: Check[], now: number) => Promise<number[]>;

export const isSharedRateLimit = hasRedis;

const redisStore: CounterStore = async (checks) => {
  // One pipeline: INCR + PEXPIRE per key. Expiry is the window length, so keys clean themselves up.
  const commands = checks.flatMap((c) => [
    ['INCR', c.key],
    ['PEXPIRE', c.key, String(c.limit.windowMs)],
  ]);
  const results = await redisPipeline(commands);
  return checks.map((_, i) => {
    const r = results[i * 2];
    if (r?.error || typeof r?.result !== 'number') throw new Error(`Redis INCR failed: ${r?.error ?? 'no result'}`);
    return r.result;
  });
};

const memory = new Map<string, { count: number; expires: number }>();
const memoryStore: CounterStore = async (checks, now) => {
  if (memory.size > 5000) for (const [k, v] of memory) if (v.expires <= now) memory.delete(k);
  return checks.map((c) => {
    const entry = memory.get(c.key);
    const next = entry && entry.expires > now ? { ...entry, count: entry.count + 1 } : { count: 1, expires: c.windowEnd };
    memory.set(c.key, next);
    return next.count;
  });
};

// ---------- Limiting ----------

export function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
}

const tooMany = (windowMs: number, retryAfterSeconds: number) =>
  Response.json(
    {
      error:
        windowMs >= DAY
          ? "Today's limit for Claude features has been reached. Please try again tomorrow."
          : 'Too many requests. Please wait a moment and try again.',
    },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfterSeconds)) } }
  );

/**
 * Count this request against `limits` (each counted separately). Returns a 429 response to send
 * back, or null if the request may proceed. If the shared store is unreachable in production,
 * Claude features are paused (fail closed) rather than left unlimited.
 */
export async function rateLimit(
  request: Request,
  limits: { name: LimitName; global?: boolean }[],
  userId?: string,
  now = Date.now()
): Promise<Response | null> {
  const client = userId ? `user:${userId}` : clientKey(request);
  const checks: Check[] = limits.map(({ name, global }) => {
    const limit = LIMITS[name];
    const window = Math.floor(now / limit.windowMs);
    return { key: `rl:${name}:${global ? 'all' : client}:${window}`, limit, windowEnd: (window + 1) * limit.windowMs };
  });

  let counts: number[];
  try {
    counts = await (isSharedRateLimit() ? redisStore : memoryStore)(checks, now);
  } catch (error) {
    console.error('Rate limit store failed:', error);
    if (process.env.VERCEL_ENV === 'production') {
      return Response.json({ error: 'This feature is temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }
    return null;
  }

  for (let i = 0; i < checks.length; i++) {
    if (counts[i] > checks[i].limit.max) {
      return tooMany(checks[i].limit.windowMs, Math.ceil((checks[i].windowEnd - now) / 1000));
    }
  }
  return null;
}

/** The standard limits for a route that calls Claude. */
export const limitClaudeRequest = (request: Request, userId?: string) =>
  rateLimit(request, [{ name: 'claudePerMinute' }, { name: 'claudePerDay' }, { name: 'claudeGlobalPerDay', global: true }], userId);

/** The limit for a market-data route (prices, news). Cheap, but the provider quota is shared. */
export const limitMarketRequest = (request: Request, userId?: string) =>
  rateLimit(request, [{ name: 'marketPerMinute' }], userId);
