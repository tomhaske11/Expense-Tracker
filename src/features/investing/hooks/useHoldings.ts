'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';
import { generateId } from '@/lib/utils';
import type { Holding, HoldingInput, InvestmentAccount } from '@/features/investing/lib/types';

interface HoldingRow {
  id: string;
  symbol: string;
  shares: number | string;
  cost_basis: number | string | null;
  account: string;
  created_at: string;
  updated_at: string;
}

const fromRow = (r: HoldingRow): Holding => ({
  id: r.id,
  symbol: r.symbol,
  shares: Number(r.shares),
  costBasis: r.cost_basis === null ? null : Number(r.cost_basis),
  account: r.account as InvestmentAccount,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toRow = (h: HoldingInput) => ({ symbol: h.symbol, shares: h.shares, cost_basis: h.costBasis, account: h.account });

/** The user's holdings, read once outside React (the assistant's get_my_holdings tool). */
export async function fetchHoldings(): Promise<Holding[]> {
  const { data, error } = await getSupabaseBrowser().from('holdings').select('*').order('created_at');
  if (error) throw new Error("Couldn't load holdings.");
  return ((data ?? []) as HoldingRow[]).map(fromRow);
}

/**
 * The user's holdings (public.holdings, limited to their rows by RLS). Changes are optimistic:
 * the list updates at once and rolls back with an error message if saving fails.
 */
export function useHoldings() {
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getSupabaseBrowser()
      .from('holdings')
      .select('*')
      .order('created_at')
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) setError("Couldn't load your holdings.");
        setHoldings(((data ?? []) as HoldingRow[]).map(fromRow));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addHolding = useCallback(async (input: HoldingInput) => {
    const now = new Date().toISOString();
    const holding: Holding = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    setError(null);
    setHoldings((list) => [...(list ?? []), holding]);
    const { error: saveError } = await getSupabaseBrowser().from('holdings').insert({ id: holding.id, ...toRow(input) });
    if (saveError) {
      setHoldings((list) => (list ?? []).filter((h) => h.id !== holding.id));
      setError(`Couldn't save ${input.symbol}. Please try again.`);
    }
  }, []);

  const updateHolding = useCallback(
    async (id: string, input: HoldingInput) => {
      const previous = holdings?.find((h) => h.id === id);
      setError(null);
      setHoldings((list) => (list ?? []).map((h) => (h.id === id ? { ...h, ...input, updatedAt: new Date().toISOString() } : h)));
      const { error: saveError } = await getSupabaseBrowser().from('holdings').update(toRow(input)).eq('id', id);
      if (saveError && previous) {
        setHoldings((list) => (list ?? []).map((h) => (h.id === id ? previous : h)));
        setError(`Couldn't save ${input.symbol}. Please try again.`);
      }
    },
    [holdings]
  );

  const removeHolding = useCallback(
    async (id: string) => {
      const previous = holdings;
      setError(null);
      setHoldings((list) => (list ?? []).filter((h) => h.id !== id));
      const { error: saveError } = await getSupabaseBrowser().from('holdings').delete().eq('id', id);
      if (saveError) {
        setHoldings(previous);
        setError("Couldn't remove that holding. Please try again.");
      }
    },
    [holdings]
  );

  return { holdings, error, addHolding, updateHolding, removeHolding };
}
