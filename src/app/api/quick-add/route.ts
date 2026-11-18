import { QuickAddRequestSchema } from '@/features/expenses/lib/quickAdd';
import { QuickAddError, parseExpenseText } from '@/features/expenses/server/parseExpenseText';
import { limitClaudeRequest } from '@/lib/rateLimit';
import { requireUser } from '@/integrations/supabase/server';

/** POST { text, today } → ParsedExpense. Parses only; the browser saves after the user confirms. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const input = QuickAddRequestSchema.safeParse(body);
  if (!input.success) {
    return Response.json({ error: 'Enter a short description of one expense.' }, { status: 400 });
  }

  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const limited = await limitClaudeRequest(request, user.id);
  if (limited) return limited;

  try {
    const parsed = await parseExpenseText(input.data.text, input.data.today);
    return Response.json(parsed);
  } catch (error) {
    const status = error instanceof QuickAddError ? error.status : 500;
    const message = error instanceof QuickAddError ? error.message : 'Quick add failed. Please try again.';
    return Response.json({ error: message }, { status });
  }
}
