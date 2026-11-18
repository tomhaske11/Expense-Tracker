import { getUserId } from '@/lib/session';
import { getBankProvider } from '@/features/imports/server/bank';

/** POST → { linkToken, institutions, provider }: starts a "connect your bank" session. */
export async function POST(request: Request) {
  const provider = getBankProvider();
  const session = await provider.createLinkToken(getUserId(request));
  return Response.json({ ...session, provider: provider.id, sandbox: !provider.live });
}
