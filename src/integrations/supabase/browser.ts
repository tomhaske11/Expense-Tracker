'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/env';

/*
 * The browser's Supabase client: the signed-in user's session lives in cookies (so the server
 * and proxy can read it), and every query runs as that user under row-level security.
 */

// Explicit schema: the project's default exposed schema may not be `public`.
const create = () => createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { db: { schema: 'public' } });

let client: ReturnType<typeof create> | null = null;

export function getSupabaseBrowser() {
  client ??= create();
  return client;
}
