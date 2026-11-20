import 'server-only';
import type { NewsArticle, PricePoint } from '@/features/investing/lib/types';

/**
 * A market-data source. Implementations return raw data; caching, range slicing and quote
 * calculation happen in `server/market/index.ts`, so a new provider only has to fetch.
 */
export interface MarketDataProvider {
  id: string;
  /** True for generated data (the UI labels it). */
  sandbox: boolean;
  /** How current prices are, for the UI: "end of day", "15-minute delayed". */
  freshness: string;
  /** Daily closes for about the last `days` calendar days, oldest first. Empty if the symbol is unknown. */
  dailyCloses(symbol: string, days: number): Promise<PricePoint[]>;
  /** Recent news, newest first: about these tickers if given, otherwise general market news. */
  news(tickers: string[], limit: number): Promise<NewsArticle[]>;
}

/** Thrown when the provider refuses for quota reasons; callers fall back to cached data. */
export class MarketRateLimitError extends Error {}
