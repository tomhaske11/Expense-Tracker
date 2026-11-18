import type Anthropic from '@anthropic-ai/sdk';
import { ASSISTANT_MAX_BODY_BYTES, AssistantRequestSchema } from '@/features/assistant/lib/protocol';
import { streamAssistantTurn } from '@/features/assistant/server/streamAssistantTurn';

/**
 * POST { messages } → NDJSON stream of AssistantStreamEvents for one Claude turn.
 * Stateless: the browser keeps the conversation, runs the tools, and saves any approved changes.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > ASSISTANT_MAX_BODY_BYTES) {
    return Response.json({ error: 'This conversation is too long. Start a new chat.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const input = AssistantRequestSchema.safeParse(body);
  if (!input.success) {
    return Response.json({ error: 'Invalid conversation. Start a new chat.' }, { status: 400 });
  }

  // Block-level shapes are validated by the Claude API itself.
  const messages = input.data.messages as Anthropic.Beta.BetaMessageParam[];

  return new Response(streamAssistantTurn(messages, request.signal), {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
