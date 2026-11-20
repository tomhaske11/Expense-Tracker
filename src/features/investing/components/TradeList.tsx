'use client';

import { useMemo, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EditIcon, TrashIcon } from '@/lib/icons';
import { sortTrades } from '@/features/investing/lib/ledger';
import type { Trade, TradeType } from '@/features/investing/lib/types';
import Change from '@/features/investing/components/Change';

const TYPE_STYLE: Record<TradeType, string> = {
  buy: 'text-accent border-accent/40',
  sell: 'text-amber-300 border-amber-300/40',
  dividend: 'text-ink-soft border-line',
};
const SELECT = 'px-3 py-2 bg-panel-raised border border-line rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent';
const fmtShares = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 6 });

interface TradeListProps {
  trades: Trade[];
  /** Realized gain per sell id, from the ledger. */
  realized: Record<string, number | null>;
  onEdit: (trade: Trade) => void;
  /** Resolves to an error message, or null when deleted. */
  onDelete: (trade: Trade) => Promise<string | null>;
}

/** Every trade, newest first, filterable by ticker and type, with edit and delete. */
export default function TradeList({ trades, realized, onEdit, onDelete }: TradeListProps) {
  const [symbol, setSymbol] = useState('All');
  const [type, setType] = useState<'All' | TradeType>('All');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const symbols = useMemo(() => [...new Set(trades.map((t) => t.symbol))].sort(), [trades]);
  const shown = sortTrades(trades)
    .reverse()
    .filter((t) => (symbol === 'All' || t.symbol === symbol) && (type === 'All' || t.type === type));

  const remove = async (trade: Trade) => {
    setConfirming(null);
    setNote(await onDelete(trade));
  };

  return (
    <section className="bg-panel border border-line rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-ink">History</h2>
        <div className="flex gap-2">
          <label htmlFor="filter-symbol" className="sr-only">Ticker</label>
          <select id="filter-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} className={SELECT}>
            <option value="All">All tickers</option>
            {symbols.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <label htmlFor="filter-type" className="sr-only">Type</label>
          <select id="filter-type" value={type} onChange={(e) => setType(e.target.value as 'All' | TradeType)} className={SELECT}>
            <option value="All">All types</option>
            <option value="buy">Buys</option>
            <option value="sell">Sells</option>
            <option value="dividend">Dividends</option>
          </select>
        </div>
      </div>
      {note && <p className="mb-3 text-sm text-red-400">{note}</p>}

      {shown.length === 0 ? (
        <p className="text-sm text-ink-muted">No trades match these filters.</p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((t) => {
            const total = t.type === 'dividend' ? t.amount ?? 0 : t.price === null ? null : (t.shares ?? 0) * t.price + (t.type === 'buy' ? t.fees : -t.fees);
            const gain = t.type === 'sell' ? realized[t.id] : undefined;
            return (
              <li key={t.id} className="py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[6.5rem_5.5rem_1fr_auto_auto] gap-x-4 gap-y-1 items-center">
                <span className="text-sm text-ink-muted order-2 sm:order-none col-span-2 sm:col-span-1">{formatDate(t.date)}</span>
                <span className="order-1 sm:order-none">
                  <span className={`text-xs font-medium uppercase tracking-wide border rounded-full px-2 py-0.5 ${TYPE_STYLE[t.type]}`}>{t.type}</span>
                  <span className="sm:hidden ml-2 text-ink font-medium">{t.symbol}</span>
                </span>
                <div className="order-3 sm:order-none col-span-2 sm:col-span-1 min-w-0">
                  <p className="text-ink">
                    <span className="hidden sm:inline font-medium">{t.symbol} </span>
                    <span className="text-ink-soft">
                      {t.type === 'dividend' ? 'Cash received' : `${fmtShares(t.shares ?? 0)} shares${t.price !== null ? ` @ ${formatCurrency(t.price)}` : ' (cost unknown)'}`}
                    </span>
                  </p>
                  <p className="text-xs text-ink-muted truncate">
                    {t.account}
                    {t.fees > 0 && ` · ${formatCurrency(t.fees)} fees`}
                    {t.note && ` · ${t.note}`}
                  </p>
                </div>
                <div className="order-1 sm:order-none text-right">
                  <p className="text-ink tabular-nums">{total === null ? '—' : formatCurrency(total)}</p>
                  {gain !== undefined && (gain === null ? <p className="text-xs text-ink-faint">gain unknown</p> : <Change amount={gain} className="text-xs" />)}
                </div>
                <div className="order-4 sm:order-none col-span-2 sm:col-span-1 flex gap-1 justify-end">
                  {confirming === t.id ? (
                    <>
                      <button type="button" onClick={() => void remove(t)} className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700">
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} className="px-3 py-1 rounded-full border border-line text-ink-soft text-xs">
                        Keep
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => {
                          setNote(null);
                          onEdit(t);
                        }} aria-label={`Edit ${t.type} of ${t.symbol} on ${t.date}`} className="p-2 rounded-full text-ink-muted hover:text-accent">
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => {
                          setNote(null);
                          setConfirming(t.id);
                        }} aria-label={`Delete ${t.type} of ${t.symbol} on ${t.date}`} className="p-2 rounded-full text-ink-muted hover:text-red-400">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
