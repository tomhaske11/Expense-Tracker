import { requireUser } from '@/integrations/supabase/server';
import { limitMarketRequest } from '@/lib/rateLimit';
import { getPrices } from '@/features/investing/server/market';
import { parseSymbols } from '@/features/investing/server/params';
import { RANGES, type PriceRange, type PricesResponse } from '@/features/investing/lib/types';

/** GET ?symbols=SPY,AAPL&range=1M → PricesResponse (quote + daily closes per symbol). */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const params = new URL(request.url).searchParams;
  const symbols = parseSymbols(params.get('symbols'), 40);
  const range = (params.get('range') ?? '1M') as PriceRange;
  if (!symbols || symbols.length === 0 || !RANGES.includes(range)) {
    return Response.json({ error: 'Pass up to 40 ticker symbols and a range of 1M, 3M, YTD or 1Y.' }, { status: 400 });
  }
  const limited = await limitMarketRequest(request, user.id);
  if (limited) return limited;
  const body: PricesResponse = await getPrices(symbols, range);
  return Response.json(body);
}
