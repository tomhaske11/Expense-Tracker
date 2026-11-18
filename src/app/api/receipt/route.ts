import { ReceiptRequestSchema } from '@/features/expenses/lib/quickAdd';
import { QuickAddError, parseReceiptImage } from '@/features/expenses/server/parseExpenseText';
import { limitClaudeRequest } from '@/lib/rateLimit';
import { requireUser } from '@/integrations/supabase/server';

/** POST { image: { mediaType, data }, today } → ParsedExpense. Reads only; the browser saves after the user confirms. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const input = ReceiptRequestSchema.safeParse(body);
  if (!input.success) {
    return Response.json({ error: 'That image is too large or not a supported type.' }, { status: 400 });
  }

  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const limited = limitClaudeRequest(request, user.id);
  if (limited) return limited;

  try {
    const parsed = await parseReceiptImage(input.data.image, input.data.today);
    return Response.json(parsed);
  } catch (error) {
    const status = error instanceof QuickAddError ? error.status : 500;
    const message = error instanceof QuickAddError ? error.message : 'Reading the receipt failed. Please try again.';
    return Response.json({ error: message }, { status });
  }
}
