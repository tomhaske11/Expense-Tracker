'use client';

import { FormEvent, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { CloseIcon, StarIcon } from '@/lib/icons';
import { isValidSymbol, normalizeSymbol, type PricesResponse } from '@/features/investing/lib/types';
import Change from '@/features/investing/components/Change';
import Sparkline from '@/features/investing/components/Sparkline';

interface WatchlistProps {
  symbols: string[];
  prices: PricesResponse['prices'] | null;
  error: string | null;
  /** Resolves to an error message, or null when added. */
  onAdd: (symbol: string) => Promise<string | null>;
  onRemove: (symbol: string) => void;
}

/** Tickers you follow but don't own: price, today's change and a trend line for each. */
export default function Watchlist({ symbols, prices, error, onAdd, onRemove }: WatchlistProps) {
  const [input, setInput] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const symbol = normalizeSymbol(input);
    if (!isValidSymbol(symbol)) return setNote('Enter a ticker symbol, like AAPL.');
    if (symbols.includes(symbol)) return setNote(`${symbol} is already on your watchlist.`);
    setChecking(true);
    const message = await onAdd(symbol);
    setChecking(false);
    setNote(message);
    if (!message) setInput('');
  };

  return (
    <section className="bg-panel border border-line rounded-lg p-6">
      <h2 className="text-lg font-semibold text-ink flex items-center gap-2 mb-4">
        <StarIcon className="w-5 h-5 text-accent" />
        Watchlist
      </h2>
      <form onSubmit={(e) => void submit(e)} className="flex gap-2 mb-4">
        <label htmlFor="watch-symbol" className="sr-only">Ticker to watch</label>
        <input
          id="watch-symbol"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Add a ticker, like AAPL"
          autoCapitalize="characters"
          autoComplete="off"
          className="flex-1 min-w-0 px-3 py-2 bg-panel-raised border border-line rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button type="submit" disabled={checking || !input.trim()} className="px-4 py-2 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors text-sm disabled:opacity-50">
          {checking ? 'Checking…' : 'Add'}
        </button>
      </form>
      {(note || error) && <p className="mb-3 text-sm text-ink-soft">{note ?? error}</p>}

      {symbols.length === 0 ? (
        <p className="text-sm text-ink-muted">Nothing here yet. Add companies or funds you&apos;re keeping an eye on.</p>
      ) : (
        <ul className="divide-y divide-line">
          {symbols.map((symbol) => {
            const s = prices?.[symbol];
            return (
              <li key={symbol} className="py-3 grid grid-cols-[4.5rem_1fr_auto_auto] items-center gap-3">
                <span className="text-ink font-medium">{symbol}</span>
                {s ? <Sparkline points={s.points} className="h-8" /> : <span />}
                <span className="text-right">
                  <span className="block text-ink tabular-nums text-sm">{s ? formatCurrency(s.quote.price) : prices ? 'No price' : '…'}</span>
                  {s && <Change percent={s.quote.changePercent} className="text-xs" />}
                </span>
                <button type="button" onClick={() => onRemove(symbol)} aria-label={`Remove ${symbol} from watchlist`} className="p-1.5 rounded-full text-ink-muted hover:text-red-400">
                  <CloseIcon className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
