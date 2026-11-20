import type { ToolOutcome } from '@/features/assistant/lib/runTools';
import { MarketPatternInput, MarketTrendInput, MyHoldingsInput } from '@/features/assistant/lib/tools';
import type { AnalysisRequest } from '@/features/investing/lib/analysis';
import { fetchHoldings } from '@/features/investing/hooks/useHoldings';

/*
 * The assistant's market tools, run in the browser. Indicators and pattern statistics come
 * from /api/markets/analysis (computed on the server from cached prices); holdings come from
 * the user's own rows in Supabase.
 */

export const MARKET_TOOLS = new Set(['get_market_trend', 'test_market_pattern', 'get_my_holdings']);

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
        const holdings = await fetchHoldings();
        return {
          ok: true,
          result: {
            count: holdings.length,
            holdings: holdings.map((h) => ({ symbol: h.symbol, shares: h.shares, account: h.account, total_cost: h.costBasis })),
          },
        };
      } catch {
        return { ok: false, error: "Couldn't load the user's holdings." };
      }
    }
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
