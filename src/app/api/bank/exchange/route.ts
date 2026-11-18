import { requireUser } from '@/integrations/supabase/server';
import { ExchangeRequestSchema } from '@/features/imports/lib/protocol';
import { getBankProvider } from '@/features/imports/server/bank';
import { getConnectionStore, sealToken, toView } from '@/features/imports/server/bank/connectionStore';
import { readJson } from '@/features/imports/server/http';

/** POST { publicToken } → BankConnectionView. The access token is stored server-side only. */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const input = await readJson(request, ExchangeRequestSchema, 'Missing the bank link token.');
  if (input instanceof Response) return input;
  const provider = getBankProvider();
  let result;
  try {
    result = await provider.exchangePublicToken(input.publicToken);
  } catch {
    return Response.json({ error: "Couldn't connect to the bank. Please try again." }, { status: 400 });
  }
  const connection = {
    id: `conn_${crypto.randomUUID()}`,
    userId: user.id,
    provider: provider.id,
    institution: result.institution,
    accounts: result.accounts,
    createdAt: new Date().toISOString(),
    lastSyncedAt: null,
    accessToken: sealToken(result.accessToken, provider.live),
    cursor: null,
  };
  await getConnectionStore().save(connection);
  return Response.json(toView(connection));
}
