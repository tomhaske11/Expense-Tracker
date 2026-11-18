import { limitClaudeRequest } from '@/lib/rateLimit';
import { requireUser } from '@/integrations/supabase/server';
import { SuggestRequestSchema } from '@/features/imports/lib/protocol';
import { suggestCategories } from '@/features/imports/server/claudeImport';
import { errorResponse, readJson } from '@/features/imports/server/http';

/** POST { items } → { suggestions }: categories and clean vendor names for unfamiliar transactions. */
export async function POST(request: Request) {
  const input = await readJson(request, SuggestRequestSchema, 'Invalid transactions.');
  if (input instanceof Response) return input;
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const limited = limitClaudeRequest(request, user.id);
  if (limited) return limited;
  try {
    return Response.json(await suggestCategories(input.items));
  } catch (error) {
    return errorResponse(error, 'Categorizing transactions failed. Please try again.');
  }
}
