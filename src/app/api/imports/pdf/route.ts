import { limitClaudeRequest } from '@/lib/rateLimit';
import { requireUser } from '@/integrations/supabase/server';
import { PdfRequestSchema } from '@/features/imports/lib/protocol';
import { readPdfStatement } from '@/features/imports/server/claudeImport';
import { errorResponse, readJson } from '@/features/imports/server/http';

/** POST { data } (base64 PDF) → PdfStatement: every transaction in the statement. */
export async function POST(request: Request) {
  const input = await readJson(request, PdfRequestSchema, 'That PDF is too large or not valid.');
  if (input instanceof Response) return input;
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const limited = limitClaudeRequest(request, user.id);
  if (limited) return limited;
  try {
    return Response.json(await readPdfStatement(input.data));
  } catch (error) {
    return errorResponse(error, 'Reading the PDF failed. Please try again.');
  }
}
