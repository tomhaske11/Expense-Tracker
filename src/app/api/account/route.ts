import { getSupabaseAdmin, requireUser } from '@/integrations/supabase/server';
import { getBankProvider } from '@/features/imports/server/bank';
import { getConnectionStore, openToken } from '@/features/imports/server/bank/connectionStore';

/**
 * DELETE → permanently deletes the signed-in user's account. Bank tokens are revoked first;
 * deleting the auth user then cascades to every row they own (expenses, settings, connections).
 */
export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const store = getConnectionStore();
  for (const connection of await store.list(user.id)) {
    try {
      await getBankProvider().removeItem(openToken(connection.accessToken));
    } catch (error) {
      console.error('Revoking a bank token during account deletion failed:', error);
    }
    await store.remove(user.id, connection.id);
  }

  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Account deletion failed:', error.message);
    return Response.json({ error: "Couldn't delete your account. Please try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
