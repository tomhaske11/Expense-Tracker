import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Turn an Anthropic SDK error into an HTTP status and a message that's safe to show the user.
 * `feature` names the feature in messages, e.g. "Quick add".
 */
export function describeAnthropicError(error: unknown, feature: string): { status: number; message: string } {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return { status: 500, message: `${feature} is not configured: check ANTHROPIC_API_KEY on the server.` };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { status: 429, message: 'Too many requests right now. Please wait a moment and try again.' };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { status: 503, message: "Couldn't reach Claude. Check your connection and try again." };
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error(`${feature} bad request:`, error.message);
    return { status: 400, message: 'Claude rejected the request. Please try again.' };
  }
  if (error instanceof Anthropic.APIError) {
    console.error(`${feature} API error:`, error.status, error.message);
    return { status: 502, message: 'Claude returned an error. Please try again.' };
  }
  if (error instanceof Anthropic.AnthropicError) {
    console.error(`${feature} client error:`, error.message);
    // Thrown when the client is created without credentials, or for client-side request problems.
    return /api.?key|auth|credential/i.test(error.message)
      ? { status: 500, message: `${feature} is not configured: set ANTHROPIC_API_KEY on the server.` }
      : { status: 500, message: `${feature} failed. Please try again.` };
  }
  console.error(`${feature} failed:`, error);
  return { status: 500, message: `${feature} failed. Please try again.` };
}
