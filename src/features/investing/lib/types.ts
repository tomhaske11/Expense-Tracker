import { z } from 'zod';

/*
 * Investing data shared by the browser and the server. Prices and news come from the server
 * (market-data provider behind a shared cache); holdings and the watchlist live in Supabase.
 */

/** Ticker symbols as stored: upper case, starting with a letter (BRK.B, RDS-A). */
export const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;
export const normalizeSymbol = (raw: string) => raw.trim().toUpperCase();
export const isValidSymbol = (symbol: string) => SYMBOL_PATTERN.test(symbol);

/** One daily close. `date` is yyyy-MM-dd (the trading day). */
export interface PricePoint {
  date: string;
  close: number;
}

export interface Quote {
  symbol: string;
  price: number;
  /** Change since the previous close. */
  change: number;
  changePercent: number;
  /** Trading day of `price`, yyyy-MM-dd. */
  asOf: string;
}

/** A symbol's latest quote plus its daily closes over the requested range (oldest first). */
export interface PriceSeries {
  quote: Quote;
  points: PricePoint[];
}

export const RANGES = ['1M', '3M', 'YTD', '1Y'] as const;
export type PriceRange = (typeof RANGES)[number];
export const RANGE_LABELS: Record<PriceRange, string> = { '1M': 'Past month', '3M': 'Past 3 months', YTD: 'Year to date', '1Y': 'Past year' };

export interface PricesResponse {
  /** null for a symbol the provider doesn't know or couldn't price. */
  prices: Record<string, PriceSeries | null>;
  /** True when the data is generated sandbox data, not real prices. */
  sandbox: boolean;
  /** How current the prices are, e.g. "15-minute delayed" or "end of day". */
  freshness: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  /** Null for sandbox headlines. */
  url: string | null;
  publisher: string;
  publishedAt: string;
  tickers: string[];
  description: string | null;
}

export interface NewsResponse {
  articles: NewsArticle[];
  sandbox: boolean;
}

/** Claude's one-line explanation per article id. */
export const NewsNotesSchema = z.object({
  notes: z.array(z.object({ id: z.string(), why: z.string() })),
});
export type NewsNotes = z.infer<typeof NewsNotesSchema>;

export const ACCOUNTS = ['Brokerage', '401(k)', 'IRA', 'Roth IRA', 'HSA', 'Other'] as const;
export type InvestmentAccount = (typeof ACCOUNTS)[number];

export interface Holding {
  /** Client-generated. */
  id: string;
  symbol: string;
  shares: number;
  /** What the whole position cost, if known. */
  costBasis: number | null;
  account: InvestmentAccount;
  createdAt: string;
  updatedAt: string;
}

export type HoldingInput = Pick<Holding, 'symbol' | 'shares' | 'costBasis' | 'account'>;
