import type { ToolOutcome } from '@/features/assistant/lib/runTools';
import { MarketPatternInput, MarketTrendInput, MyHoldingsInput, MyTradesInput } from '@/features/assistant/lib/tools';
import type { AnalysisRequest } from '@/features/investing/lib/analysis';
import { fetchTradesAndHoldings } from '@/features/investing/hooks/useTrades';
import { sortTrades } from '@/features/investing/lib/ledger';

/*
 * The assistant's market tools, run in the browser. Indicators and pattern statistics come
 * from /api/markets/analysis (computed on the server from cached prices); holdings come from
 * the user's trades in Supabase (positions are calculated from them).
 */

export const MARKET_TOOLS = new Set(['get_market_trend', 'test_market_pattern', 'get_my_holdings', 'get_my_trades']);
const MAX_TRADES = 200;

async function analyze(request: AnalysisRequest): Promise<ToolOutcome> {
  try {
    const res = await fetch('/api/markets/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: (data as { error?: string } | null)?.error ?? 'Market data request failed.' };
    return { ok: true, result: data };
  } catch {
    return { ok: false, error: "Couldn't reach the market data service." };
  }
}

export async function runMarketTool(name: string, rawInput: unknown): Promise<ToolOutcome> {
  switch (name) {
    case 'get_market_trend': {
      const input = MarketTrendInput.safeParse(rawInput);
      if (!input.success) return { ok: false, error: input.error.issues[0]?.message ?? 'Invalid input.' };
      return analyze({ kind: 'trend', symbol: input.data.symbol });
    }
    case 'test_market_pattern': {
      const input = MarketPatternInput.safeParse(rawInput);
      if (!input.success) return { ok: false, error: input.error.issues[0]?.message ?? 'Invalid input.' };
      const { symbol, condition, horizon_days, level } = input.data;
      return analyze({ kind: 'pattern', symbol, condition, horizon_days: horizon_days ?? 20, level });
    }
    case 'get_my_holdings': {
      if (!MyHoldingsInput.safeParse(rawInput ?? {}).success) return { ok: false, error: 'This tool takes no input.' };
      try {
        const { holdings, ledger } = await fetchTradesAndHoldings();
        return {
          ok: true,
          result: {
            count: holdings.length,
            holdings: holdings.map((h) => ({ symbol: h.symbol, shares: h.shares, account: h.account, remaining_cost: h.costBasis })),
            realized_gains_total: ledger.realizedTotal,
            dividends_total: ledger.dividendsTotal,
            note: 'Calculated from the user\'s trades (average cost). remaining_cost is null when a buy had no price.',
          },
        };
      } catch {
        return { ok: false, error: "Couldn't load the user's holdings." };
      }
    }
    case 'get_my_trades': {
      const input = MyTradesInput.safeParse(rawInput ?? {});
      if (!input.success) return { ok: false, error: input.error.issues[0]?.message ?? 'Invalid input.' };
      try {
        const { trades, ledger } = await fetchTradesAndHoldings();
        const symbol = input.data.symbol?.toUpperCase();
        const matching = sortTrades(trades)
          .reverse()
          .filter((t) => !symbol || t.symbol === symbol);
        return {
          ok: true,
          result: {
            count: matching.length,
            trades: matching.slice(0, MAX_TRADES).map((t) => ({
              date: t.date,
              type: t.type,
              symbol: t.symbol,
              account: t.account,
              shares: t.shares,
              price: t.price,
              fees: t.fees,
              amount: t.amount,
              ...(t.type === 'sell' && { realized_gain: ledger.realized[t.id] ?? null }),
            })),
            ...(matching.length > MAX_TRADES && { note: `Only the ${MAX_TRADES} most recent are listed.` }),
          },
        };
      } catch {
        return { ok: false, error: "Couldn't load the user's trades." };
      }
    }
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
