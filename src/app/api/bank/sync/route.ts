import { requireUser } from '@/integrations/supabase/server';
import { SyncRequestSchema, type SyncResponse } from '@/features/imports/lib/protocol';
import { getBankProvider } from '@/features/imports/server/bank';
import { getConnectionStore, openToken } from '@/features/imports/server/bank/connectionStore';
import { readJson } from '@/features/imports/server/http';

/**
 * POST { connectionId } → SyncResponse: transactions since the last acknowledged cursor.
 * The stored cursor only moves on /api/bank/ack, after the browser has saved the import,
 * so a cancelled review is simply offered again next time.
 */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const input = await readJson(request, SyncRequestSchema, 'Missing the connection.');
  if (input instanceof Response) return input;
  const connection = await getConnectionStore().get(user.id, input.connectionId);
  if (!connection) return Response.json({ error: 'Connection not found.' }, { status: 404 });

  const provider = getBankProvider();
  const transactions: SyncResponse['transactions'] = [];
  const removed: string[] = [];
  let cursor = connection.cursor;
  try {
    const token = openToken(connection.accessToken);
    for (let page = 0; page < 20; page++) {
      const result = await provider.sync(token, cursor);
      transactions.push(...result.added);
      removed.push(...result.removed);
      cursor = result.nextCursor;
      if (!result.hasMore) break;
    }
  } catch (error) {
    console.error('Bank sync failed:', error);
    return Response.json({ error: "Couldn't reach the bank. Please try again later." }, { status: 502 });
  }
  const body: SyncResponse = { connectionId: connection.id, transactions, removed, nextCursor: cursor ?? '' };
  return Response.json(body);
}
