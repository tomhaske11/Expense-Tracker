'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';

/** The user's watchlist symbols (public.watchlist), oldest first. Changes are optimistic. */
export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getSupabaseBrowser()
      .from('watchlist')
      .select('symbol')
      .order('created_at')
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) setError("Couldn't load your watchlist.");
        setSymbols(((data ?? []) as { symbol: string }[]).map((r) => r.symbol));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(async (symbol: string) => {
    setError(null);
    setSymbols((list) => (list?.includes(symbol) ? list : [...(list ?? []), symbol]));
    const { error: saveError } = await getSupabaseBrowser().from('watchlist').upsert({ symbol }, { onConflict: 'user_id,symbol', ignoreDuplicates: true });
    if (saveError) {
      setSymbols((list) => (list ?? []).filter((s) => s !== symbol));
      setError(`Couldn't add ${symbol}. Please try again.`);
    }
  }, []);

  const remove = useCallback(async (symbol: string) => {
    setError(null);
    setSymbols((list) => (list ?? []).filter((s) => s !== symbol));
    const { error: saveError } = await getSupabaseBrowser().from('watchlist').delete().eq('symbol', symbol);
    if (saveError) {
      setSymbols((list) => [...(list ?? []), symbol]);
      setError(`Couldn't remove ${symbol}. Please try again.`);
    }
  }, []);

  return { symbols, error, add, remove };
}
