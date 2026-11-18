import 'server-only';
import type { ZodType } from 'zod';
import { ImportError } from '@/features/imports/server/claudeImport';

/** Parse and validate a JSON body; returns the data or an error Response. */
export async function readJson<T>(request: Request, schema: ZodType<T>, invalid: string): Promise<T | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  return parsed.success ? parsed.data : Response.json({ error: invalid }, { status: 400 });
}

/** Turn a thrown error into a JSON error Response. */
export function errorResponse(error: unknown, fallback: string): Response {
  if (error instanceof ImportError) return Response.json({ error: error.message }, { status: error.status });
  console.error(fallback, error);
  return Response.json({ error: fallback }, { status: 500 });
}
