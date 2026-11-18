import { requireUser } from '@/integrations/supabase/server';
import { getBankProvider } from '@/features/imports/server/bank';
import { getConnectionStore, openToken, toView } from '@/features/imports/server/bank/connectionStore';

/** GET → { connections }: the user's bank connections (no tokens). */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const connections = await getConnectionStore().list(user.id);
  return Response.json({ connections: connections.map(toView) });
}

/** DELETE ?id=… → disconnects the bank and revokes its token. Imported expenses stay. */
export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const id = new URL(request.url).searchParams.get('id');
  const userId = user.id;
  const store = getConnectionStore();
  const connection = id ? await store.get(userId, id) : null;
  if (!connection) return Response.json({ error: 'Connection not found.' }, { status: 404 });
  try {
    await getBankProvider().removeItem(openToken(connection.accessToken));
  } catch (error) {
    console.error('Revoking bank token failed:', error);
  }
  await store.remove(userId, connection.id);
  return Response.json({ ok: true });
}
