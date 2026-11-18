import 'server-only';

/*
 * Optional password gate. When APP_PASSWORD is set (e.g. when hosting publicly), every page
 * and API route requires a session cookie; when it's unset (local development) the app is open.
 * The cookie holds an HMAC of the password, so changing APP_PASSWORD signs everyone out.
 */

export const SESSION_COOKIE = 'et_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

async function hmacHex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Compare strings without exiting early on the first difference. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The cookie value for a valid session under the current APP_PASSWORD. */
export async function sessionToken(): Promise<string> {
  return hmacHex(process.env.APP_PASSWORD ?? '', 'expense-tracker-session-v1');
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!isAuthEnabled()) return true;
  if (!token) return false;
  return safeEqual(token, await sessionToken());
}

export async function isCorrectPassword(password: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  // Compare HMACs so the comparison doesn't depend on the password's length.
  const [given, wanted] = await Promise.all([hmacHex('pw', password), hmacHex('pw', expected)]);
  return safeEqual(given, wanted);
}

/**
 * The signed-in user's id, for per-user server data such as bank connections. With the single
 * APP_PASSWORD gate there is one user; real accounts will return their user id here.
 */
export function getUserId(request: Request): string {
  void request;
  return 'owner';
}
