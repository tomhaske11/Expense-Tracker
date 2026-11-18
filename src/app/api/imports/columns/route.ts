import { limitClaudeRequest } from '@/lib/rateLimit';
import { MapColumnsRequestSchema } from '@/features/imports/lib/protocol';
import { mapStatementColumns } from '@/features/imports/server/claudeImport';
import { errorResponse, readJson } from '@/features/imports/server/http';

/** POST { rows } (a CSV's first rows) → ColumnMapping. Only a sample of the file is sent. */
export async function POST(request: Request) {
  const input = await readJson(request, MapColumnsRequestSchema, 'Send the first rows of the statement.');
  if (input instanceof Response) return input;
  const limited = limitClaudeRequest(request);
  if (limited) return limited;
  try {
    return Response.json(await mapStatementColumns(input.rows));
  } catch (error) {
    return errorResponse(error, 'Reading the statement columns failed. Please try again.');
  }
}
