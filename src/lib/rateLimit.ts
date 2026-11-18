import 'server-only';

/*
 * In-memory rate limiting for the routes that spend the Anthropic API key. Counters live in
 * this server process, which fits the single `next start` deployment this app uses; with
 * several instances or serverless hosting, move them to a shared store (e.g. Redis).
 *
 * Clients are keyed by the first x-forwarded-for address. That header can be spoofed unless a
 * trusted proxy sets it, so the app-wide daily cap is the backstop that bounds total spend.
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
  /** Password attempts, per client. */
  loginPerMinute: { max: 5, windowMs: MINUTE },
} satisfies Record<string, Limit>;

const hits = new Map<string, number[]>();

/** Record a hit for `key` under `limit`. Returns seconds to wait if the limit is exceeded. */
function hit(key: string, limit: Limit, now: number): number | null {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < limit.windowMs);
  if (recent.length >= limit.max) {
    hits.set(key, recent);
    return Math.max(1, Math.ceil((recent[0] + limit.windowMs - now) / 1000));
  }
  recent.push(now);
  hits.set(key, recent);
  return null;
}

export function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
}

/**
 * Check `limits` in order for this request (each named limit is counted separately).
 * Returns a 429 response to send back, or null if the request may proceed.
 */
export function rateLimit(
  request: Request,
  limits: { name: keyof typeof LIMITS; global?: boolean }[]
): Response | null {
  const now = Date.now();
  const client = clientKey(request);
  // Drop idle clients now and then so the map can't grow without bound.
  if (hits.size > 5000) {
    for (const [key, times] of hits) if (now - times[times.length - 1] >= DAY) hits.delete(key);
  }
  for (const { name, global } of limits) {
    const retryAfter = hit(global ? `${name}:all` : `${name}:${client}`, LIMITS[name], now);
    if (retryAfter !== null) {
      const message =
        LIMITS[name].windowMs >= DAY
          ? "Today's limit for Claude features has been reached. Please try again tomorrow."
          : 'Too many requests. Please wait a moment and try again.';
      return Response.json({ error: message }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
    }
  }
  return null;
}

/** The standard limits for a route that calls Claude. */
export const limitClaudeRequest = (request: Request) =>
  rateLimit(request, [
    { name: 'claudePerMinute' },
    { name: 'claudePerDay' },
    { name: 'claudeGlobalPerDay', global: true },
  ]);
