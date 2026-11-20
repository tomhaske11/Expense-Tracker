import { requireUser } from '@/integrations/supabase/server';
import { limitMarketRequest } from '@/lib/rateLimit';
import { getNews } from '@/features/investing/server/market';
import { parseSymbols } from '@/features/investing/server/params';
import type { NewsResponse } from '@/features/investing/lib/types';

/** GET ?tickers=AAPL,MSFT → NewsResponse about those tickers; without tickers, general market news. */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const tickers = parseSymbols(new URL(request.url).searchParams.get('tickers'), 5);
  if (!tickers) return Response.json({ error: 'Pass up to 5 ticker symbols.' }, { status: 400 });
  const limited = await limitMarketRequest(request, user.id);
  if (limited) return limited;
  try {
    const body: NewsResponse = await getNews(tickers);
    return Response.json(body);
  } catch (error) {
    console.error('News failed:', error instanceof Error ? error.message : error);
    return Response.json({ error: "Couldn't load the news right now." }, { status: 502 });
  }
}
