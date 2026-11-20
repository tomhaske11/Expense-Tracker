-- Investing: holdings entered by the user, and a watchlist of ticker symbols.
-- Idempotent: safe to run more than once. Run in the Supabase SQL Editor after 20261118120000_init.sql.

-- ---------- Holdings ----------
-- One row per position: a ticker, how many shares, which account it's in, and optionally what
-- the whole position cost (for gain/loss). Prices are never stored; they come from market data.
create table if not exists public.holdings (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z][A-Z0-9.-]{0,9}$'),
  shares numeric(18, 6) not null check (shares > 0),
  cost_basis numeric(14, 2) check (cost_basis is null or cost_basis >= 0),
  account text not null default 'Brokerage'
    check (account in ('Brokerage', '401(k)', 'IRA', 'Roth IRA', 'HSA', 'Other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists holdings_user_idx on public.holdings (user_id);
alter table public.holdings enable row level security;

drop policy if exists "Users read their own holdings" on public.holdings;
create policy "Users read their own holdings" on public.holdings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create their own holdings" on public.holdings;
create policy "Users create their own holdings" on public.holdings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users change their own holdings" on public.holdings;
create policy "Users change their own holdings" on public.holdings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete their own holdings" on public.holdings;
create policy "Users delete their own holdings" on public.holdings
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists holdings_touch on public.holdings;
create trigger holdings_touch before update on public.holdings
  for each row execute function public.touch_updated_at();

-- ---------- Watchlist ----------
create table if not exists public.watchlist (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z][A-Z0-9.-]{0,9}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

alter table public.watchlist enable row level security;

drop policy if exists "Users read their own watchlist" on public.watchlist;
create policy "Users read their own watchlist" on public.watchlist
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users add to their own watchlist" on public.watchlist;
create policy "Users add to their own watchlist" on public.watchlist
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users remove from their own watchlist" on public.watchlist;
create policy "Users remove from their own watchlist" on public.watchlist
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Table privileges ----------
revoke all on public.holdings, public.watchlist from anon;
grant select, insert, update, delete on public.holdings to authenticated;
grant select, insert, delete on public.watchlist to authenticated;
grant all on public.holdings, public.watchlist to service_role;
