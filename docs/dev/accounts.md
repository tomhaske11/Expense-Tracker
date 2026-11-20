# Accounts & server data (Supabase)

expenseAI stores each user's data in Supabase (Postgres) and signs users in with Supabase Auth.
The browser talks to Supabase directly; row-level security (RLS) makes every query see only
the signed-in user's rows. The same model works for the web app and the Capacitor iPhone app.

## Setting up a Supabase project

1. Create a project (US East for US users).
2. **Project Settings → Data API:** the Data API must be on and `public` must be an exposed
   schema. (The app pins `db.schema = 'public'`, so the order of exposed schemas doesn't matter.)
3. **SQL Editor:** run each file in `supabase/migrations/` in order (`20261118120000_init.sql`, then `20261120120000_investing.sql`, then `20261121120000_trades.sql`). They're idempotent.
4. **Authentication → URL Configuration:** Site URL = the app's origin (`http://localhost:3000`
   locally, the Vercel URL in production); add `<origin>/**` to Redirect URLs. Email links
   (confirmation, password reset) land on `/auth/confirm`.
5. Copy `.env.example` to `.env.local` and fill in the URL (bare, no `/rest/v1`), the
   publishable key and the secret key. Restart `npm run dev` after changing env vars.

## Schema (`supabase/migrations/`)

| Table | Access | Notes |
|---|---|---|
| `expenses` | RLS: own rows (select/insert/update/delete) | PK `(user_id, id)`; `id` stays client-generated; `amount numeric(12,2) > 0`; category check; `source jsonb` for imports with a unique `(user_id, source->>'externalId')` index; in the `supabase_realtime` publication |
| `user_settings` | RLS: own row | `daily_budget`: no longer used by the app (the daily budget setting was removed on 2026-11-20); left in place |
| `bank_connections` | RLS on, **no policies**: server secret key only | encrypted aggregator tokens, sync cursor |
| `trades` | RLS: own rows | buys, sells, dividends; holdings are calculated from these; from `20261121120000_trades.sql` |
| `holdings` | RLS: own rows | legacy: copied into opening buys by the trades migration; no longer used |
| `watchlist` | RLS: own rows (select/insert/delete) | PK `(user_id, symbol)` |

All tables cascade-delete with `auth.users`, so deleting an account deletes its data.
Schema changes go in new migration files; never edit an applied one. Bump `BACKUP_VERSION`
when the expense shape changes.

## Code map

| Piece | Where |
|---|---|
| Browser client (cookie session, `public` schema) | `integrations/supabase/browser.ts` |
| Server helpers: `getUserFromRequest` / `requireUser` (cookie **or** `Authorization: Bearer`), `getSupabaseAdmin` (secret key) | `integrations/supabase/server.ts` |
| Gate: refreshes the session; pages → `/login`, `/api/*` → 401; Bearer requests pass to the route | `src/proxy.ts` |
| Expenses store (optimistic writes with rollback, realtime refetch, sign-out clears cache) | `features/expenses/hooks/useExpenses.ts` |
| Pages | `/login`, `/signup`, `/forgot-password`, `/auth/confirm` (route), `/account`, `/account/password` |
| Account deletion (revokes bank tokens, then `auth.admin.deleteUser`) | `src/app/api/account/route.ts` |
| One-time import of pre-accounts browser data | `features/export/components/LocalDataImport.tsx` |

Every API route calls `requireUser(request)` first; Claude routes rate-limit per user id.
Routes that touch server-only tables use `getSupabaseAdmin()` and always filter by the
verified user id.

## Native app (Capacitor) notes

The app bundles the static pages and calls the deployed API. Because a native shell can't rely
on the web origin's cookies, API routes also accept `Authorization: Bearer <Supabase access
token>`; the native build should use `@supabase/supabase-js` with its own storage and send that
header. RLS covers direct database access the same way in both clients.

## Known follow-ups

- `revoke ... from anon` in the migration didn't seem to take effect on the first project
  (anonymous reads return `[]` rather than "permission denied"). RLS still returns no rows and
  blocks writes; check `\dp public.expenses` in the SQL Editor and re-apply if needed.
- A deleted user's existing access token stays valid until it expires (~1 hour); every query
  then fails RLS because the user no longer owns rows.
