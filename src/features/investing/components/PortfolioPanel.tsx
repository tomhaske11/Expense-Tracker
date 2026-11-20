'use client';

import { type ReactNode, useMemo } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { PlusIcon } from '@/lib/icons';
import { summarizePortfolio, formatShare } from '@/features/investing/lib/portfolio';
import type { Holding, PricesResponse } from '@/features/investing/lib/types';
import Change from '@/features/investing/components/Change';

interface PortfolioPanelProps {
  holdings: Holding[];
  prices: PricesResponse['prices'] | null;
  error: string | null;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel-raised p-4">
      <p className="text-xs uppercase tracking-widest text-ink-muted mb-1">{label}</p>
      <div className="text-lg sm:text-xl font-semibold text-ink tabular-nums">{children}</div>
    </div>
  );
}

/**
 * Your investments: value, today's change, gain, the split by account, and each position.
 * Positions are calculated from trades; they change by recording a trade on Transactions.
 */
export default function PortfolioPanel({ holdings, prices, error }: PortfolioPanelProps) {
  const summary = useMemo(() => summarizePortfolio(holdings, prices ?? {}), [holdings, prices]);
  const priced = prices !== null;

  return (
    <section className="bg-panel border border-line rounded-lg p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-ink">Your portfolio</h2>
        <Link
          href="/transactions?new=1"
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong transition-colors text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4" />
          Record a trade
        </Link>
      </div>

      {holdings.length === 0 ? (
        <p className="text-ink-muted">
          Record what you&apos;ve bought, in a brokerage account, 401(k) or IRA, and your positions show up here with their value and how they move each day.{' '}
          <Link href="/transactions?new=1" className="text-accent hover:text-accent-strong">Record your first buy</Link>.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Stat label="Value">{priced ? formatCurrency(summary.value) : '…'}</Stat>
            <Stat label="Today">{priced ? <Change amount={summary.dayChange} percent={summary.dayChangePercent} /> : '…'}</Stat>
            <Stat label="Total gain">
              {summary.gain === null ? (
                <span className="text-sm font-normal text-ink-muted">Add buy prices to see gains</span>
              ) : (
                <Change amount={summary.gain} percent={summary.gainPercent ?? undefined} />
              )}
            </Stat>
          </div>

          {summary.byAccount.length > 1 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-ink-soft mb-2">By account</h3>
              <ul className="space-y-2">
                {summary.byAccount.map((a) => (
                  <li key={a.account} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="text-ink-soft">{a.account}</span>
                    <span className="h-2 rounded-full bg-panel-raised overflow-hidden">
                      <span className="block h-full bg-accent rounded-full" style={{ width: `${a.percent}%` }} />
                    </span>
                    <span className="text-ink tabular-nums">
                      {formatCurrency(a.value)} <span className="text-ink-muted">· {formatShare(a.percent)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="divide-y divide-line border-t border-line">
            {summary.positions.map((p) => (
              <li key={p.holding.id} className="py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(8rem,1.2fr)_1fr_1fr_1fr] gap-x-4 gap-y-1 items-center">
                  <div>
                    <p className="text-ink font-medium">{p.holding.symbol}</p>
                    <p className="text-xs text-ink-muted">
                      {p.holding.account} · {p.holding.shares.toLocaleString('en-US', { maximumFractionDigits: 6 })} shares
                    </p>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-ink tabular-nums">{p.value !== null ? formatCurrency(p.value) : priced ? 'No price' : '…'}</p>
                    <p className="text-xs text-ink-muted tabular-nums">
                      {p.price !== null ? `${formatCurrency(p.price)} · ${formatShare(p.weight, 1)} of total` : ''}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="text-xs text-ink-muted sm:hidden">Today </span>
                    {p.dayChange !== null ? <Change amount={p.dayChange} /> : <span className="text-ink-faint">—</span>}
                  </div>
                  <div className="text-sm text-right sm:text-left">
                    <span className="text-xs text-ink-muted sm:hidden">Gain </span>
                    {p.gain !== null ? <Change amount={p.gain} percent={p.gainPercent ?? undefined} /> : <span className="text-ink-faint">—</span>}
                  </div>
                </li>
            ))}
          </ul>
          {summary.unpriced.length > 0 && priced && (
            <p className="mt-3 text-sm text-amber-300">No price found for {summary.unpriced.join(', ')}; they&apos;re left out of the totals.</p>
          )}
        </>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}
