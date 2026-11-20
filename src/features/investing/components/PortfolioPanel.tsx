'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { EditIcon, PlusIcon, TrashIcon } from '@/lib/icons';
import { summarizePortfolio, formatShare } from '@/features/investing/lib/portfolio';
import type { Holding, HoldingInput, PricesResponse } from '@/features/investing/lib/types';
import Change from '@/features/investing/components/Change';
import HoldingForm from '@/features/investing/components/HoldingForm';

interface PortfolioPanelProps {
  holdings: Holding[];
  prices: PricesResponse['prices'] | null;
  error: string | null;
  /** Each resolves to an error message, or null when saved. */
  onAdd: (input: HoldingInput) => Promise<string | null>;
  onUpdate: (id: string, input: HoldingInput) => Promise<string | null>;
  onRemove: (id: string) => void;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel-raised p-4">
      <p className="text-xs uppercase tracking-widest text-ink-muted mb-1">{label}</p>
      <div className="text-lg sm:text-xl font-semibold text-ink tabular-nums">{children}</div>
    </div>
  );
}

/** Your investments: value, today's change, gain, the split by account, and each position. */
export default function PortfolioPanel({ holdings, prices, error, onAdd, onUpdate, onRemove }: PortfolioPanelProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const summary = useMemo(() => summarizePortfolio(holdings, prices ?? {}), [holdings, prices]);
  const priced = prices !== null;

  const add = async (input: HoldingInput) => {
    const message = await onAdd(input);
    if (!message) setAdding(false);
    return message;
  };
  const update = async (id: string, input: HoldingInput) => {
    const message = await onUpdate(id, input);
    if (!message) setEditing(null);
    return message;
  };

  return (
    <section className="bg-panel border border-line rounded-lg p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-ink">Your portfolio</h2>
        {holdings.length > 0 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Add holding
          </button>
        )}
      </div>

      {holdings.length === 0 ? (
        <div className="mb-2">
          <p className="text-ink-muted mb-4">
            Add what you own, in a brokerage account, 401(k) or IRA, to see its value and how it moves each day. Holdings stay in your account; only ticker symbols are used to look up prices.
          </p>
          <HoldingForm onSubmit={add} />
        </div>
      ) : (
        <>
          {adding && (
            <div className="mb-6 rounded-lg border border-line p-4">
              <HoldingForm onSubmit={add} onCancel={() => setAdding(false)} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Stat label="Value">{priced ? formatCurrency(summary.value) : '…'}</Stat>
            <Stat label="Today">{priced ? <Change amount={summary.dayChange} percent={summary.dayChangePercent} /> : '…'}</Stat>
            <Stat label="Total gain">
              {summary.gain === null ? (
                <span className="text-sm font-normal text-ink-muted">Add what you paid to see gains</span>
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
            {summary.positions.map((p) =>
              editing === p.holding.id ? (
                <li key={p.holding.id} className="py-4">
                  <HoldingForm initial={p.holding} onSubmit={(input) => update(p.holding.id, input)} onCancel={() => setEditing(null)} />
                </li>
              ) : (
                <li key={p.holding.id} className="py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(8rem,1.2fr)_1fr_1fr_1fr_auto] gap-x-4 gap-y-1 items-center">
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
                  <div className="col-span-2 sm:col-span-1 flex gap-1 justify-end">
                    <button type="button" onClick={() => setEditing(p.holding.id)} aria-label={`Edit ${p.holding.symbol}`} className="p-2 rounded-full text-ink-muted hover:text-accent">
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => onRemove(p.holding.id)} aria-label={`Remove ${p.holding.symbol}`} className="p-2 rounded-full text-ink-muted hover:text-red-400">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              )
            )}
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
