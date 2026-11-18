import { getUserId } from '@/lib/session';
import { AckRequestSchema } from '@/features/imports/lib/protocol';
import { getConnectionStore, toView } from '@/features/imports/server/bank/connectionStore';
import { readJson } from '@/features/imports/server/http';

/** POST { connectionId, cursor } → BankConnectionView: records that a sync's import was saved. */
export async function POST(request: Request) {
  const input = await readJson(request, AckRequestSchema, 'Missing the sync cursor.');
  if (input instanceof Response) return input;
  const store = getConnectionStore();
  const connection = await store.get(getUserId(request), input.connectionId);
  if (!connection) return Response.json({ error: 'Connection not found.' }, { status: 404 });
  const updated = { ...connection, cursor: input.cursor, lastSyncedAt: new Date().toISOString() };
  await store.save(updated);
  return Response.json(toView(updated));
}
