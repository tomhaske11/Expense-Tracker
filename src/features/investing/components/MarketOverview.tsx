'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { MARKET_INDEXES } from '@/features/investing/lib/markets';
import { RANGE_LABELS, type PriceRange, type PricesResponse } from '@/features/investing/lib/types';
import Change from '@/features/investing/components/Change';
import Sparkline from '@/features/investing/components/Sparkline';
import PriceChart from '@/features/investing/components/PriceChart';
import RangePicker from '@/features/investing/components/RangePicker';

interface MarketOverviewProps {
  prices: PricesResponse['prices'] | null;
  range: PriceRange;
  onRangeChange: (range: PriceRange) => void;
}

/** The four index funds as tiles; the selected one gets a full chart over the chosen range. */
export default function MarketOverview({ prices, range, onRangeChange }: MarketOverviewProps) {
  const [selected, setSelected] = useState<string>(MARKET_INDEXES[0].symbol);
  const index = MARKET_INDEXES.find((i) => i.symbol === selected) ?? MARKET_INDEXES[0];
  const series = prices?.[index.symbol] ?? null;
  const rangeChange = series && series.points.length > 1 ? (series.quote.price / series.points[0].close - 1) * 100 : null;

  return (
    <section className="bg-panel border border-line rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-ink">Markets</h2>
        <RangePicker value={range} onChange={onRangeChange} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {MARKET_INDEXES.map((i) => {
          const s = prices?.[i.symbol];
          const active = i.symbol === selected;
          return (
            <button
              key={i.symbol}
              type="button"
              onClick={() => setSelected(i.symbol)}
              aria-pressed={active}
              className={`text-left rounded-lg border p-3 transition-colors ${active ? 'border-accent bg-accent/5' : 'border-line bg-panel-raised hover:border-accent/60'}`}
            >
              <p className="text-sm text-ink-soft font-medium truncate">{i.name}</p>
              <p className="text-xs text-ink-faint">{i.symbol}</p>
              {s ? (
                <>
                  <p className="mt-2 text-ink font-semibold tabular-nums">{formatCurrency(s.quote.price)}</p>
                  <Change percent={s.quote.changePercent} className="text-sm" />
                  <Sparkline points={s.points} className="h-10 mt-2" />
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-muted h-[88px]">{prices ? 'Unavailable' : 'Loading…'}</p>
              )}
            </button>
          );
        })}
      </div>

      {series ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
            <p className="text-ink font-medium">{index.name}</p>
            <p className="text-sm text-ink-muted">
              {RANGE_LABELS[range]}
            </p>
            {rangeChange !== null && <Change percent={rangeChange} className="text-sm" />}
          </div>
          <PriceChart points={series.points} label={index.name} />
        </>
      ) : (
        <div className="h-64 flex items-center justify-center text-sm text-ink-muted">{prices ? 'Prices are unavailable right now.' : 'Loading…'}</div>
      )}
    </section>
  );
}
