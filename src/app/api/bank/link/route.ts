import { requireUser } from '@/integrations/supabase/server';
import { getBankProvider } from '@/features/imports/server/bank';

/** POST → { linkToken, institutions, provider }: starts a "connect your bank" session. */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const provider = getBankProvider();
  const session = await provider.createLinkToken(user.id);
  return Response.json({ ...session, provider: provider.id, sandbox: !provider.live });
}
