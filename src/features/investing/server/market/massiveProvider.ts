import 'server-only';
import { format, subDays } from 'date-fns';
import { MarketRateLimitError, type MarketDataProvider } from '@/features/investing/server/market/provider';
import type { NewsArticle, PricePoint } from '@/features/investing/lib/types';

/*
 * Massive (formerly Polygon.io) REST API. Needs MASSIVE_API_KEY. The free plan has end-of-day
 * prices and 5 requests a minute; Starter ($29/mo) has 15-minute delayed prices and no request
 * cap. Displaying data to other people needs a business plan (see docs/dev/investing.md).
 *   Daily bars: GET /v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}
 *   News:       GET /v2/reference/news?ticker=…
 */

const BASE = (process.env.MASSIVE_API_BASE ?? 'https://api.massive.com').replace(/\/$/, '');

interface AggsResponse {
  results?: { t: number; c: number }[];
}

interface NewsResult {
  id: string;
  title: string;
  article_url?: string;
  published_utc: string;
  publisher?: { name?: string };
  tickers?: string[];
  description?: string;
}

/** The trading day of a bar's start time (bars start at midnight New York time). */
const tradingDay = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

export class MassiveMarketProvider implements MarketDataProvider {
  id = 'massive';
  sandbox = false;
  freshness = process.env.MARKET_DATA_FRESHNESS ?? 'delayed';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 429) throw new MarketRateLimitError('Market data rate limit reached.');
    if (!res.ok) throw new Error(`Market data request failed (${res.status}).`);
    return (await res.json()) as T;
  }

  async dailyCloses(symbol: string, days: number): Promise<PricePoint[]> {
    const to = new Date();
    const from = subDays(to, days);
    const data = await this.get<AggsResponse>(
      `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${format(from, 'yyyy-MM-dd')}/${format(to, 'yyyy-MM-dd')}?adjusted=true&sort=asc&limit=5000`
    );
    return (data.results ?? [])
      .filter((r) => Number.isFinite(r.c) && Number.isFinite(r.t))
      .map((r) => ({ date: tradingDay(r.t), close: r.c }));
  }

  async news(tickers: string[], limit: number): Promise<NewsArticle[]> {
    const query = (ticker?: string) =>
      `/v2/reference/news?order=desc&sort=published_utc&limit=${limit}${ticker ? `&ticker=${encodeURIComponent(ticker)}` : ''}`;
    const batches = tickers.length
      ? await Promise.all(tickers.map((t) => this.get<{ results?: NewsResult[] }>(query(t))))
      : [await this.get<{ results?: NewsResult[] }>(query())];

    const seen = new Set<string>();
    const articles: NewsArticle[] = [];
    for (const r of batches.flatMap((b) => b.results ?? [])) {
      if (seen.has(r.id) || !r.title) continue;
      seen.add(r.id);
      articles.push({
        id: r.id,
        title: r.title,
        url: r.article_url?.startsWith('https://') ? r.article_url : null,
        publisher: r.publisher?.name ?? 'Unknown source',
        publishedAt: r.published_utc,
        tickers: (r.tickers ?? []).slice(0, 6),
        description: r.description ?? null,
      });
    }
    return articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit);
  }
}
