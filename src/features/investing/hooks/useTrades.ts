'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';
import { generateId } from '@/lib/utils';
import { computeLedger, toHoldings } from '@/features/investing/lib/ledger';
import type { InvestmentAccount, Trade, TradeInput, TradeType } from '@/features/investing/lib/types';

interface TradeRow {
  id: string;
  date: string;
  type: string;
  symbol: string;
  account: string;
  shares: number | string | null;
  price: number | string | null;
  fees: number | string;
  amount: number | string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

const num = (v: number | string | null) => (v === null ? null : Number(v));

const fromRow = (r: TradeRow): Trade => ({
  id: r.id,
  date: r.date,
  type: r.type as TradeType,
  symbol: r.symbol,
  account: r.account as InvestmentAccount,
  shares: num(r.shares),
  price: num(r.price),
  fees: Number(r.fees),
  amount: num(r.amount),
  note: r.note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toRow = (t: TradeInput) => ({
  date: t.date,
  type: t.type,
  symbol: t.symbol,
  account: t.account,
  shares: t.shares,
  price: t.price,
  fees: t.fees,
  amount: t.amount,
  note: t.note,
});

async function loadTrades(): Promise<Trade[]> {
  const { data, error } = await getSupabaseBrowser().from('trades').select('*').order('date').order('created_at');
  if (error) throw new Error("Couldn't load your trades.");
  return ((data ?? []) as TradeRow[]).map(fromRow);
}

/** Trades and the holdings calculated from them, read once outside React (the assistant's tools). */
export async function fetchTradesAndHoldings() {
  const trades = await loadTrades();
  const ledger = computeLedger(trades);
  return { trades, ledger, holdings: toHoldings(ledger) };
}

/**
 * The user's trades (public.trades, own rows only by RLS) and the positions they add up to.
 * Changes are optimistic and roll back with an error message if saving fails. Callers check a
 * change with `computeLedger` first, so a sell can't exceed what was held.
 */
export function useTrades() {
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTrades().then(
      (list) => !cancelled && setTrades(list),
      (e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Couldn't load your trades.");
        setTrades([]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const ledger = useMemo(() => (trades ? computeLedger(trades) : null), [trades]);
  const holdings = useMemo(() => (ledger ? toHoldings(ledger) : null), [ledger]);

  const addTrade = useCallback(async (input: TradeInput) => {
    const now = new Date().toISOString();
    const trade: Trade = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    setError(null);
    setTrades((list) => [...(list ?? []), trade]);
    const { error: saveError } = await getSupabaseBrowser().from('trades').insert({ id: trade.id, ...toRow(input) });
    if (saveError) {
      setTrades((list) => (list ?? []).filter((t) => t.id !== trade.id));
      setError(`Couldn't save that ${input.type}. Please try again.`);
      return false;
    }
    return true;
  }, []);

  const updateTrade = useCallback(
    async (id: string, input: TradeInput) => {
      const previous = trades?.find((t) => t.id === id);
      setError(null);
      setTrades((list) => (list ?? []).map((t) => (t.id === id ? { ...t, ...input, updatedAt: new Date().toISOString() } : t)));
      const { error: saveError } = await getSupabaseBrowser().from('trades').update(toRow(input)).eq('id', id);
      if (saveError && previous) {
        setTrades((list) => (list ?? []).map((t) => (t.id === id ? previous : t)));
        setError("Couldn't save that change. Please try again.");
        return false;
      }
      return true;
    },
    [trades]
  );

  const removeTrade = useCallback(
    async (id: string) => {
      const previous = trades;
      setError(null);
      setTrades((list) => (list ?? []).filter((t) => t.id !== id));
      const { error: saveError } = await getSupabaseBrowser().from('trades').delete().eq('id', id);
      if (saveError) {
        setTrades(previous);
        setError("Couldn't delete that trade. Please try again.");
      }
    },
    [trades]
  );

  return { trades, ledger, holdings, error, addTrade, updateTrade, removeTrade };
}
