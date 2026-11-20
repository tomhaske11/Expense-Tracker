'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { InvestIcon } from '@/lib/icons';
import { INDEX_SYMBOLS, MARKET_INDEXES } from '@/features/investing/lib/markets';
import { summarizePortfolio } from '@/features/investing/lib/portfolio';
import { useHoldings } from '@/features/investing/hooks/useHoldings';
import { useNews, usePrices } from '@/features/investing/hooks/useMarketData';
import Change, { SandboxBadge } from '@/features/investing/components/Change';

/** Home's daily glance at investing: your portfolio today, the indexes, and the top headlines. */
export default function MarketsBrief() {
  const { holdings } = useHoldings();
  const owned = useMemo(() => [...new Set((holdings ?? []).map((h) => h.symbol))], [holdings]);
  const prices = usePrices(holdings === null ? [] : [...INDEX_SYMBOLS, ...owned], '1M');
  const summary = useMemo(() => (holdings && prices.data ? summarizePortfolio(holdings, prices.data.prices) : null), [holdings, prices.data]);
  const top = summary?.positions.slice(0, 5).map((p) => p.holding.symbol) ?? [];
  const news = useNews(top, holdings !== null && (holdings.length === 0 || summary !== null));

  return (
    <section className="bg-panel border border-line rounded-lg p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
          <InvestIcon className="w-5 h-5 text-accent" />
          Markets today
          {prices.data?.sandbox && <SandboxBadge />}
        </h2>
        <Link href="/invest" className="text-sm text-accent hover:text-accent-strong whitespace-nowrap">
          Open Invest
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="space-y-4">
          {summary && holdings && holdings.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-muted mb-1">Your portfolio</p>
              <p className="text-2xl font-semibold text-ink tabular-nums">{formatCurrency(summary.value)}</p>
              <Change amount={summary.dayChange} percent={summary.dayChangePercent} className="text-sm" />
            </div>
          ) : (
            holdings?.length === 0 && (
              <p className="text-sm text-ink-muted">
                <Link href="/invest" className="text-accent hover:text-accent-strong">Add your investments</Link> to see how they move each day.
              </p>
            )
          )}
          <ul className="grid grid-cols-2 gap-2">
            {MARKET_INDEXES.map((i) => {
              const s = prices.data?.prices[i.symbol];
              return (
                <li key={i.symbol} className="rounded-lg bg-panel-raised border border-line px-3 py-2">
                  <p className="text-xs text-ink-muted truncate">{i.name}</p>
                  {s ? <Change percent={s.quote.changePercent} className="text-sm font-medium" /> : <p className="text-sm text-ink-faint">{prices.loading ? '…' : '—'}</p>}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-ink-muted mb-2">{top.length ? 'About your stocks' : 'Headlines'}</p>
          {news.data ? (
            news.data.articles.length ? (
              <ul className="space-y-3">
                {news.data.articles.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-ink hover:text-accent">{a.title}</a>
                    ) : (
                      <p className="text-sm text-ink">{a.title}</p>
                    )}
                    <p className="text-xs text-ink-muted">{a.publisher} · {formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true })}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">No recent headlines.</p>
            )
          ) : (
            <p className="text-sm text-ink-muted">{news.error ?? 'Loading…'}</p>
          )}
        </div>
      </div>
    </section>
  );
}
