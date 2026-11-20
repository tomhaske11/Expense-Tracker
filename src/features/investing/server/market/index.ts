import 'server-only';
import { format, startOfYear, subMonths, subYears } from 'date-fns';
import { cached } from '@/lib/cache';
import type { MarketDataProvider } from '@/features/investing/server/market/provider';
import { MockMarketProvider } from '@/features/investing/server/market/mockProvider';
import { MassiveMarketProvider } from '@/features/investing/server/market/massiveProvider';
import type { NewsArticle, PriceRange, PriceSeries, PricePoint } from '@/features/investing/lib/types';

/**
 * The configured market-data provider: MARKET_DATA_PROVIDER ("mock" or "massive"); by default
 * Massive when MASSIVE_API_KEY is set, otherwise sandbox data.
 */
export function getMarketProvider(): MarketDataProvider {
  const key = process.env.MASSIVE_API_KEY;
  const id = process.env.MARKET_DATA_PROVIDER ?? (key ? 'massive' : 'mock');
  switch (id) {
    case 'mock':
      return new MockMarketProvider();
    case 'massive':
      if (!key) throw new Error('MASSIVE_API_KEY is not set.');
      return new MassiveMarketProvider(key);
    default:
      throw new Error(`Unknown MARKET_DATA_PROVIDER "${id}".`);
  }
}

const MINUTE = 60_000;
/** Prices: refetch after 5 minutes, but keep a copy for 3 days to fall back on. */
const PRICE_CACHE = { freshMs: 5 * MINUTE, keepMs: 3 * 24 * 60 * MINUTE };
const NEWS_CACHE = { freshMs: 15 * MINUTE, keepMs: 24 * 60 * MINUTE };
/** One year plus a margin, fetched once per symbol and sliced per range. */
const HISTORY_DAYS = 380;

function rangeStart(range: PriceRange, today = new Date()) {
  switch (range) {
    case '1M':
      return subMonths(today, 1);
    case '3M':
      return subMonths(today, 3);
    case 'YTD':
      return startOfYear(today);
    case '1Y':
      return subYears(today, 1);
  }
}

/** A symbol's quote (last close vs the one before) and its closes since the range start. */
export function toSeries(symbol: string, all: PricePoint[], range: PriceRange): PriceSeries | null {
  if (all.length === 0) return null;
  const last = all[all.length - 1];
  const prev = all.length > 1 ? all[all.length - 2] : last;
  const from = format(rangeStart(range), 'yyyy-MM-dd');
  // Start one point before the range so the line begins at the range's opening level.
  const firstIndex = Math.max(0, all.findIndex((p) => p.date >= from) - 1);
  const change = last.close - prev.close;
  return {
    quote: { symbol, price: last.close, change, changePercent: prev.close ? (change / prev.close) * 100 : 0, asOf: last.date },
    points: all.slice(firstIndex),
  };
}

/** Prices for each symbol, shared across users through the cache. Unknown or failed symbols are null. */
export async function getPrices(symbols: string[], range: PriceRange) {
  const provider = getMarketProvider();
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const all = await cached(`mkt:${provider.id}:daily:${symbol}`, PRICE_CACHE, () => provider.dailyCloses(symbol, HISTORY_DAYS));
        return [symbol, toSeries(symbol, all, range)] as const;
      } catch (error) {
        console.error(`Prices for ${symbol} failed:`, error instanceof Error ? error.message : error);
        return [symbol, null] as const;
      }
    })
  );
  return { prices: Object.fromEntries(entries), sandbox: provider.sandbox, freshness: provider.freshness };
}

/** Recent news about these tickers (or the market as a whole), shared across users through the cache. */
export async function getNews(tickers: string[], limit = 12): Promise<{ articles: NewsArticle[]; sandbox: boolean }> {
  const provider = getMarketProvider();
  const key = `mkt:${provider.id}:news:${[...tickers].sort().join(',') || 'market'}:${limit}`;
  const articles = await cached(key, NEWS_CACHE, () => provider.news(tickers, limit));
  return { articles, sandbox: provider.sandbox };
}
