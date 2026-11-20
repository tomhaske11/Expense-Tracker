'use client';

import { useEffect, useState } from 'react';
import type { NewsNotes, NewsResponse, PriceRange, PricesResponse } from '@/features/investing/lib/types';

/*
 * Read-only market data from our API (which caches the provider). Each hook keys its result by
 * the request, so a changed request shows as loading without setting state in the effect body.
 */

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? 'Request failed.');
  return data as T;
}

function useFetch<T>(url: string | null, keepPrevious = false) {
  const [state, setState] = useState<{ url: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    getJson<T>(url).then(
      (data) => !cancelled && setState({ url, data }),
      (error: unknown) => !cancelled && setState({ url, error: error instanceof Error ? error.message : 'Request failed.' })
    );
    return () => {
      cancelled = true;
    };
  }, [url]);
  const current = state && state.url === url ? state : null;
  // keepPrevious: while a new request loads, keep showing the last result (e.g. switching range).
  const data = current?.data ?? (keepPrevious && url !== null ? state?.data : undefined) ?? null;
  return { data, error: current?.error ?? null, loading: url !== null && current === null };
}

/** Quotes and daily closes for these symbols. Pass an empty list to skip. */
export function usePrices(symbols: string[], range: PriceRange) {
  const list = [...new Set(symbols)].sort().join(',');
  return useFetch<PricesResponse>(list ? `/api/markets/prices?symbols=${encodeURIComponent(list)}&range=${range}` : null, true);
}

const tickerQuery = (tickers: string[]) => [...new Set(tickers)].sort().slice(0, 5).join(',');

/** News about these tickers (up to 5), or general market news for an empty list. */
export function useNews(tickers: string[], enabled = true) {
  return useFetch<NewsResponse>(enabled ? `/api/markets/news?tickers=${encodeURIComponent(tickerQuery(tickers))}` : null);
}

/** Claude's "why it matters" notes for the same articles as useNews(tickers). */
export function useNewsNotes(tickers: string[], enabled: boolean) {
  return useFetch<NewsNotes>(enabled ? `/api/markets/news/notes?tickers=${encodeURIComponent(tickerQuery(tickers))}` : null);
}

/** Look one symbol up before saving it: its prices, or null if it isn't a known ticker. */
export async function lookUpSymbol(symbol: string) {
  const data = await getJson<PricesResponse>(`/api/markets/prices?symbols=${encodeURIComponent(symbol)}&range=1M`);
  return data.prices[symbol] ?? null;
}
