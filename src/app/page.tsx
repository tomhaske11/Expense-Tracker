'use client';

import { useMemo, useState } from 'react';
import AppShell, { PageTitle } from '@/app/_components/AppShell';
import { INDEX_SYMBOLS, DISCLAIMER } from '@/features/investing/lib/markets';
import { summarizePortfolio } from '@/features/investing/lib/portfolio';
import type { PriceRange } from '@/features/investing/lib/types';
import { useTrades } from '@/features/investing/hooks/useTrades';
import { useWatchlist } from '@/features/investing/hooks/useWatchlist';
import { lookUpSymbol, usePrices } from '@/features/investing/hooks/useMarketData';
import MarketOverview from '@/features/investing/components/MarketOverview';
import PortfolioPanel from '@/features/investing/components/PortfolioPanel';
import Watchlist from '@/features/investing/components/Watchlist';
import NewsFeed from '@/features/investing/components/NewsFeed';
import { SandboxBadge } from '@/features/investing/components/Change';

const notFound = (symbol: string) => `Couldn't find a price for ${symbol}. Check the ticker and try again.`;

/** Home: how are my investments doing, and what's moving the market? */
export default function HomePage() {
  const [range, setRange] = useState<PriceRange>('1M');
  const holdings = useTrades();
  const watchlist = useWatchlist();
  const loading = holdings.holdings === null || watchlist.symbols === null;

  const owned = useMemo(() => [...new Set((holdings.holdings ?? []).map((h) => h.symbol))], [holdings.holdings]);
  const symbols = loading ? [] : [...INDEX_SYMBOLS, ...owned, ...(watchlist.symbols ?? [])];
  const prices = usePrices(symbols, range);
  const priceMap = prices.data?.prices ?? null;

  // News follows your biggest holdings, then your watchlist.
  const newsTickers = useMemo(() => {
    const byValue = holdings.holdings && priceMap ? summarizePortfolio(holdings.holdings, priceMap).positions.map((p) => p.holding.symbol) : owned;
    return [...new Set([...byValue, ...(watchlist.symbols ?? [])])].slice(0, 5);
  }, [holdings.holdings, priceMap, owned, watchlist.symbols]);

  const addWatch = async (symbol: string) => {
    try {
      if (!(await lookUpSymbol(symbol))) return notFound(symbol);
    } catch (error) {
      return error instanceof Error ? error.message : notFound(symbol);
    }
    await watchlist.add(symbol);
    return null;
  };

  return (
    <AppShell loading={loading}>
      <PageTitle title="Investments" subtitle="Your portfolio, the markets and the news that moves them.">
        <p className="text-xs text-ink-muted flex items-center gap-2">
          {prices.data?.sandbox ? <SandboxBadge /> : prices.data && `Prices ${prices.data.freshness}`}
        </p>
      </PageTitle>

      <div className="space-y-6">
        {prices.error && <p className="text-sm text-red-400">{prices.error}</p>}
        <MarketOverview prices={priceMap} range={range} onRangeChange={setRange} />
        <PortfolioPanel
          holdings={holdings.holdings ?? []}
          prices={priceMap}
          error={holdings.error}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-6 items-start">
          <Watchlist symbols={watchlist.symbols ?? []} prices={priceMap} error={watchlist.error} onAdd={addWatch} onRemove={(s) => void watchlist.remove(s)} />
          {/* Wait for prices so the feed starts with your biggest holdings rather than switching. */}
          {prices.data || prices.error ? (
            <NewsFeed tickers={newsTickers} limit={10} />
          ) : (
            <section className="bg-panel border border-line rounded-lg p-6 text-sm text-ink-muted">Loading headlines…</section>
          )}
        </div>
        <p className="text-xs text-ink-faint">{DISCLAIMER}</p>
      </div>
    </AppShell>
  );
}
