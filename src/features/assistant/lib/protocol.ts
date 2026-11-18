import { z } from 'zod';

/*
 * Contract for POST /api/assistant. The browser owns the conversation (it runs the tools,
 * because the data is in localStorage) and sends the full message history each turn. The
 * server runs one Claude turn and streams it back as newline-delimited JSON events.
 */

/** Longest message the user can type into the chat. */
export const ASSISTANT_INPUT_MAX_LENGTH = 2000;
/** Steps (Claude turns) the browser runs per user message before stopping the tool loop. */
export const ASSISTANT_MAX_STEPS = 10;

const MAX_MESSAGES = 300;
/** Upper bound on the serialized request body, checked by the route before parsing. */
export const ASSISTANT_MAX_BODY_BYTES = 2_000_000;

// Content blocks are checked loosely here (type only); the Claude API validates the rest.
const ContentBlock = z.looseObject({ type: z.string() });

export const AssistantRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.union([z.string(), z.array(ContentBlock).min(1)]),
      })
    )
    .min(1)
    .max(MAX_MESSAGES)
    .refine((messages) => messages[0]?.role === 'user', 'The first message must be from the user.'),
});

/** One line of the response stream. */
export type AssistantStreamEvent =
  | { type: 'text'; text: string }
  /** Claude started a tool call (name only; the input arrives with `done`). */
  | { type: 'tool'; name: string }
  /** The turn finished. `content` is the assistant message to append to the history as-is. */
  | { type: 'done'; content: unknown[]; stopReason: string | null }
  | { type: 'error'; error: string };
