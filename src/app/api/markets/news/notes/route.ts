import { requireUser } from '@/integrations/supabase/server';
import { limitClaudeRequest, limitMarketRequest } from '@/lib/rateLimit';
import { cacheGet, cacheSet } from '@/lib/cache';
import { getNews } from '@/features/investing/server/market';
import { parseSymbols } from '@/features/investing/server/params';
import { NewsNotesError, getNewsNotes } from '@/features/investing/server/newsNotes';
import type { NewsNotes } from '@/features/investing/lib/types';

const HOUR = 60 * 60_000;

/**
 * GET ?tickers=… → NewsNotes: Claude's "why it matters" for the same articles /api/markets/news
 * returns. The server looks the articles up itself (the browser can't send text to Claude here),
 * and notes are cached per set of articles, so Claude runs once for everyone who sees them.
 */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const tickers = parseSymbols(new URL(request.url).searchParams.get('tickers'), 5);
  if (!tickers) return Response.json({ error: 'Pass up to 5 ticker symbols.' }, { status: 400 });
  const limited = await limitMarketRequest(request, user.id);
  if (limited) return limited;

  let articles;
  try {
    ({ articles } = await getNews(tickers));
  } catch {
    return Response.json({ error: "Couldn't load the news right now." }, { status: 502 });
  }
  if (articles.length === 0) return Response.json({ notes: [] } satisfies NewsNotes);

  const key = `news-notes:${articles.map((a) => a.id).sort().join('|')}`;
  const hit = await cacheGet<NewsNotes>(key, 24 * HOUR);
  if (hit) return Response.json(hit);

  // Only a cache miss spends Claude, so only a miss counts against the Claude limits.
  const claudeLimited = await limitClaudeRequest(request, user.id);
  if (claudeLimited) return claudeLimited;
  try {
    const notes = await getNewsNotes(articles);
    await cacheSet(key, notes, 24 * HOUR);
    return Response.json(notes);
  } catch (error) {
    const status = error instanceof NewsNotesError ? error.status : 500;
    const message = error instanceof NewsNotesError ? error.message : "Couldn't explain the headlines.";
    return Response.json({ error: message }, { status });
  }
}
