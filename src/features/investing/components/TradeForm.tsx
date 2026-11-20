'use client';

import { FormEvent, useState } from 'react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import {
  ACCOUNTS,
  TRADE_TYPES,
  isValidSymbol,
  normalizeSymbol,
  type InvestmentAccount,
  type Trade,
  type TradeInput,
  type TradeType,
} from '@/features/investing/lib/types';

const INPUT =
  'w-full px-3 py-2 bg-panel-raised border border-line rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60';
const LABEL = 'block text-sm font-medium text-ink-soft mb-1';
const TYPE_LABELS: Record<TradeType, string> = { buy: 'Buy', sell: 'Sell', dividend: 'Dividend' };

const money = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());
const priceOk = (v: string) => /^\d+(\.\d{1,4})?$/.test(v.trim());
const sharesOk = (v: string) => /^\d+(\.\d{1,6})?$/.test(v.trim()) && Number(v) > 0;

interface TradeFormProps {
  initial?: Trade;
  /** Shares currently held for the chosen symbol/account/date, for the sell hint. */
  heldFor: (symbol: string, account: InvestmentAccount, date: string) => number;
  /** Resolves to an error message, or null when saved. */
  onSubmit: (input: TradeInput) => Promise<string | null>;
  onCancel?: () => void;
}

/** Record or edit one trade: a buy, a sell or a dividend. */
export default function TradeForm({ initial, heldFor, onSubmit, onCancel }: TradeFormProps) {
  const [type, setType] = useState<TradeType>(initial?.type ?? 'buy');
  const [date, setDate] = useState(initial?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [symbol, setSymbol] = useState(initial?.symbol ?? '');
  const [account, setAccount] = useState<InvestmentAccount>(initial?.account ?? 'Brokerage');
  const [shares, setShares] = useState(initial?.shares != null ? String(initial.shares) : '');
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '');
  const [fees, setFees] = useState(initial?.fees ? String(initial.fees) : '');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const s = normalizeSymbol(symbol);
  const held = type === 'sell' && isValidSymbol(s) ? heldFor(s, account, date) : null;
  const total = type !== 'dividend' && sharesOk(shares) && priceOk(price) ? Number(shares) * Number(price) + (type === 'buy' ? 1 : -1) * Number(fees || 0) : null;
  // An opening buy carried over from holdings may have no price; keep it editable without one.
  const priceOptional = type === 'buy' && initial?.type === 'buy' && initial.price === null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!date || date > format(new Date(), 'yyyy-MM-dd')) return setError('Pick a date that isn’t in the future.');
    if (!isValidSymbol(s)) return setError('Enter a ticker symbol, like VTI or AAPL.');
    let input: TradeInput;
    if (type === 'dividend') {
      if (!money(amount) || Number(amount) <= 0) return setError('Enter the dividend received in dollars, like 12.50.');
      input = { type, date, symbol: s, account, shares: null, price: null, fees: 0, amount: Number(amount), note: note.trim() || null };
    } else {
      if (!sharesOk(shares)) return setError('Enter the number of shares (up to 6 decimals).');
      if (!(priceOptional && !price.trim()) && !priceOk(price)) return setError('Enter the price per share, like 245.10.');
      if (fees.trim() && !money(fees)) return setError('Enter fees in dollars, or leave it blank.');
      input = {
        type,
        date,
        symbol: s,
        account,
        shares: Number(shares),
        price: price.trim() ? Number(price) : null,
        fees: fees.trim() ? Number(fees) : 0,
        amount: null,
        note: note.trim() || null,
      };
    }
    setError(null);
    setSaving(true);
    const message = await onSubmit(input);
    setSaving(false);
    if (message) setError(message);
  };

  return (
    <form onSubmit={(e) => void submit(e)} aria-label={initial ? 'Edit trade' : 'Record a trade'} className="space-y-4">
      <div role="radiogroup" aria-label="Trade type" className="inline-flex rounded-full border border-line p-0.5">
        {TRADE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${type === t ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink'}`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label htmlFor="trade-date" className={LABEL}>Date</label>
          <input id="trade-date" type="date" value={date} max={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setDate(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="trade-symbol" className={LABEL}>Ticker</label>
          <input id="trade-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="VTI" autoCapitalize="characters" autoComplete="off" className={INPUT} />
        </div>
        <div className="col-span-2">
          <label htmlFor="trade-account" className={LABEL}>Account</label>
          <select id="trade-account" value={account} onChange={(e) => setAccount(e.target.value as InvestmentAccount)} className={INPUT}>
            {ACCOUNTS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {type === 'dividend' ? (
          <div className="col-span-2">
            <label htmlFor="trade-amount" className={LABEL}>Amount received</label>
            <input id="trade-amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="12.50" className={INPUT} />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="trade-shares" className={LABEL}>Shares</label>
              <input id="trade-shares" value={shares} onChange={(e) => setShares(e.target.value)} inputMode="decimal" placeholder="10" className={INPUT} />
            </div>
            <div>
              <label htmlFor="trade-price" className={LABEL}>
                Price per share{priceOptional && <span className="text-ink-faint font-normal"> (optional)</span>}
              </label>
              <input id="trade-price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="245.10" className={INPUT} />
            </div>
            <div>
              <label htmlFor="trade-fees" className={LABEL}>
                Fees <span className="text-ink-faint font-normal">(optional)</span>
              </label>
              <input id="trade-fees" value={fees} onChange={(e) => setFees(e.target.value)} inputMode="decimal" placeholder="0" className={INPUT} />
            </div>
          </>
        )}
        <div className={type === 'dividend' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
          <label htmlFor="trade-note" className={LABEL}>
            Note <span className="text-ink-faint font-normal">(optional)</span>
          </label>
          <input id="trade-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={INPUT} />
        </div>
      </div>

      {(held !== null || total !== null) && (
        <p className="text-sm text-ink-muted">
          {held !== null && `You held ${held.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${s} in ${account} on that date. `}
          {total !== null && `${type === 'buy' ? 'Total cost' : 'Proceeds'}: ${formatCurrency(total)}.`}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-5 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong disabled:opacity-50 transition-colors text-sm font-medium">
          {saving ? 'Saving…' : initial ? 'Save changes' : `Record ${TYPE_LABELS[type].toLowerCase()}`}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
