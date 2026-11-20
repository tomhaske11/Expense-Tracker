import 'server-only';

/*
 * Upstash Redis over its REST API (no client library, works in any serverless runtime).
 * Vercel's integration names the credentials KV_*; Upstash's own dashboard uses UPSTASH_REDIS_*.
 */

export function redisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export const hasRedis = () => redisConfig() !== null;

/** Run commands in one round trip; returns each command's { result } or { error }, in order. */
export async function redisPipeline(commands: string[][]): Promise<{ result?: unknown; error?: string }[]> {
  const config = redisConfig();
  if (!config) throw new Error('Redis is not configured.');
  const res = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis responded ${res.status}`);
  return (await res.json()) as { result?: unknown; error?: string }[];
}
