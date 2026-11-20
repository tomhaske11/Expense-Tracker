'use client';

import { FormEvent, useState } from 'react';
import { ACCOUNTS, isValidSymbol, normalizeSymbol, type Holding, type HoldingInput, type InvestmentAccount } from '@/features/investing/lib/types';

const INPUT = 'w-full px-3 py-2 bg-panel-raised border border-line rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60';
const LABEL = 'block text-sm font-medium text-ink-soft mb-1';

interface HoldingFormProps {
  initial?: Holding;
  /** Resolves to an error message, or null when saved. */
  onSubmit: (input: HoldingInput) => Promise<string | null>;
  onCancel?: () => void;
}

/** Add or edit one holding: ticker, shares, what it cost in total (optional) and the account. */
export default function HoldingForm({ initial, onSubmit, onCancel }: HoldingFormProps) {
  const [symbol, setSymbol] = useState(initial?.symbol ?? '');
  const [shares, setShares] = useState(initial ? String(initial.shares) : '');
  const [cost, setCost] = useState(initial?.costBasis != null ? String(initial.costBasis) : '');
  const [account, setAccount] = useState<InvestmentAccount>(initial?.account ?? 'Brokerage');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const s = normalizeSymbol(symbol);
    if (!isValidSymbol(s)) return setError('Enter a ticker symbol, like VTI or AAPL.');
    if (!/^\d+(\.\d{1,6})?$/.test(shares.trim()) || Number(shares) <= 0) return setError('Enter how many shares you hold (up to 6 decimals).');
    if (cost.trim() && !/^\d+(\.\d{1,2})?$/.test(cost.trim())) return setError('Enter the total cost in dollars, like 1500 or 1500.25.');
    setError(null);
    setSaving(true);
    const message = await onSubmit({ symbol: s, shares: Number(shares), costBasis: cost.trim() ? Number(cost) : null, account });
    setSaving(false);
    if (message) setError(message);
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end" aria-label={initial ? `Edit ${initial.symbol}` : 'Add a holding'}>
      <div>
        <label htmlFor="holding-symbol" className={LABEL}>Ticker</label>
        <input id="holding-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="VTI" autoCapitalize="characters" autoComplete="off" className={INPUT} disabled={!!initial} />
      </div>
      <div>
        <label htmlFor="holding-shares" className={LABEL}>Shares</label>
        <input id="holding-shares" value={shares} onChange={(e) => setShares(e.target.value)} inputMode="decimal" placeholder="10" className={INPUT} />
      </div>
      <div>
        <label htmlFor="holding-cost" className={LABEL}>
          Total cost <span className="text-ink-faint font-normal">(optional)</span>
        </label>
        <input id="holding-cost" value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="2500" className={INPUT} />
      </div>
      <div>
        <label htmlFor="holding-account" className={LABEL}>Account</label>
        <select id="holding-account" value={account} onChange={(e) => setAccount(e.target.value as InvestmentAccount)} className={INPUT}>
          {ACCOUNTS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      {error && <p className="col-span-2 sm:col-span-4 text-sm text-red-400">{error}</p>}
      <div className="col-span-2 sm:col-span-4 flex gap-2">
        <button type="submit" disabled={saving} className="px-5 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong disabled:opacity-50 transition-colors text-sm font-medium">
          {saving ? 'Checking…' : initial ? 'Save changes' : 'Add holding'}
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
