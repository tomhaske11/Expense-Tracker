import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/** Model used for all Claude features in this app. */
export const CLAUDE_MODEL = 'claude-opus-5-5';

let client: Anthropic | null = null;

/**
 * Lazily created, shared Anthropic client. Credentials come from the server
 * environment (ANTHROPIC_API_KEY, e.g. in .env.local) and never reach the browser.
 */
export function getAnthropicClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}
