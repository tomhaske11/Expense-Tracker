import 'server-only';
import { format, isWeekend, subDays, subHours } from 'date-fns';
import type { MarketDataProvider } from '@/features/investing/server/market/provider';
import type { NewsArticle, PricePoint } from '@/features/investing/lib/types';

/*
 * Sandbox market data: a repeatable random walk per symbol and template headlines, so the
 * Invest screen works without a market-data key. Clearly labeled "sandbox" in the UI.
 */

function hash(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Deterministic pseudo-random numbers in [0, 1). */
function random(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const KNOWN: Record<string, number> = { SPY: 590, QQQ: 510, DIA: 435, IWM: 225, VTI: 290, AAPL: 230, MSFT: 420, NVDA: 140, AMZN: 205, GOOGL: 175, VOO: 540, BND: 73 };

const HEADLINES = [
  (t: string) => `${t} shares move as investors weigh the latest earnings outlook`,
  (t: string) => `Analysts revisit expectations for ${t} ahead of next quarter`,
  (t: string) => `What rising Treasury yields could mean for ${t}`,
  () => 'Stocks edge higher as inflation data comes in near forecasts',
  () => 'Federal Reserve officials signal patience on the next rate decision',
  () => 'Oil prices slip on signs of softer global demand',
  () => 'Small-cap stocks lag as borrowing costs stay elevated',
  () => 'Consumer spending holds up in latest retail sales report',
];

export class MockMarketProvider implements MarketDataProvider {
  id = 'mock';
  sandbox = true;
  freshness = 'sandbox data';

  async dailyCloses(symbol: string, days: number): Promise<PricePoint[]> {
    // Unknown-looking symbols (e.g. "ZZZZ") price like real ones; only a few are "not found".
    if (symbol.startsWith('ZZ')) return [];
    const next = random(hash(symbol));
    const start = KNOWN[symbol] ?? 20 + next() * 300;
    const drift = 0.0003 + (next() - 0.5) * 0.0008;
    const vol = 0.008 + next() * 0.012;
    const today = new Date();
    const points: PricePoint[] = [];
    let price = start * (0.85 + next() * 0.1);
    for (let i = days; i >= 0; i--) {
      const day = subDays(today, i);
      if (isWeekend(day)) continue;
      price *= 1 + drift + (next() - 0.5) * 2 * vol;
      points.push({ date: format(day, 'yyyy-MM-dd'), close: Math.round(price * 100) / 100 });
    }
    return points;
  }

  async news(tickers: string[], limit: number): Promise<NewsArticle[]> {
    const now = new Date();
    const pool = tickers.length ? tickers : [''];
    return Array.from({ length: limit }, (_, i) => {
      const ticker = pool[i % pool.length];
      const title = ticker ? HEADLINES[(hash(ticker) + i) % 3](ticker) : HEADLINES[3 + (i % 5)]('');
      return {
        id: `mock-${ticker || 'market'}-${i}`,
        title,
        url: null,
        publisher: 'Sandbox Wire',
        publishedAt: subHours(now, i * 3 + 1).toISOString(),
        tickers: ticker ? [ticker] : [],
        description: 'A generated sandbox headline. Add a market-data key to see real news.',
      };
    });
  }
}
