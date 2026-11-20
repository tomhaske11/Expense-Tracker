import { requireUser } from '@/integrations/supabase/server';
import { limitMarketRequest } from '@/lib/rateLimit';
import { getLongHistory } from '@/features/investing/server/market';
import { AnalysisRequest } from '@/features/investing/lib/analysis';
import { computeTrend, testPattern } from '@/features/investing/lib/technicals';

/**
 * POST AnalysisRequest → indicators for one symbol (kind "trend") or historical statistics for
 * a pattern (kind "pattern"). Used by the assistant's market tools; computed from cached daily
 * closes, so every figure Claude cites comes from here.
 */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body: unknown = await request.json().catch(() => null);
  const input = AnalysisRequest.safeParse(body);
  if (!input.success) return Response.json({ error: input.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  const limited = await limitMarketRequest(request, user.id);
  if (limited) return limited;

  const req = input.data;
  let history;
  try {
    history = await getLongHistory(req.symbol);
  } catch (error) {
    console.error('Analysis history failed:', error instanceof Error ? error.message : error);
    return Response.json({ error: "Couldn't load prices right now. Try again shortly." }, { status: 502 });
  }
  if (history.points.length < 30) {
    return Response.json({ error: `No price history found for ${req.symbol}. Check the ticker.` }, { status: 404 });
  }
  if (req.kind === 'pattern' && (req.condition === 'crosses_above_level' || req.condition === 'crosses_below_level') && req.level === undefined) {
    return Response.json({ error: 'This condition needs a price level.' }, { status: 400 });
  }

  const data = {
    symbol: req.symbol,
    dataNote: history.sandbox
      ? 'SANDBOX: generated sample prices, not real market data. Any pattern in it is meaningless.'
      : `Daily closes, ${history.freshness}, ${history.points[0].date} to ${history.points[history.points.length - 1].date}.`,
    ...(req.kind === 'trend'
      ? computeTrend(history.points)
      : { condition: req.condition, ...(req.level !== undefined && { level: req.level }), ...testPattern(history.points, req.condition, req.horizon_days, req.level) }),
  };
  return Response.json(data);
}
