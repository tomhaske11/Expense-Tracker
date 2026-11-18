import { CoachSummarySchema } from '@/features/analytics/lib/coach';
import { CoachError, getCoachInsights } from '@/features/analytics/server/coachInsights';
import { limitClaudeRequest } from '@/lib/rateLimit';
import { requireUser } from '@/integrations/supabase/server';

/** POST CoachSummary (aggregates only, no individual expenses) → CoachInsights. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const input = CoachSummarySchema.safeParse(body);
  if (!input.success) {
    return Response.json({ error: 'Invalid spending summary.' }, { status: 400 });
  }

  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const limited = await limitClaudeRequest(request, user.id);
  if (limited) return limited;

  try {
    return Response.json(await getCoachInsights(input.data));
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    const message = error instanceof CoachError ? error.message : 'The budget coach failed. Please try again.';
    return Response.json({ error: message }, { status });
  }
}
