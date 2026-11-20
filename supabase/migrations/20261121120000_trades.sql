-- Investment trades: buys, sells and dividends. Holdings are calculated from these.
-- Idempotent: safe to run more than once. Run after 20261120120000_investing.sql.

create table if not exists public.trades (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  type text not null check (type in ('buy', 'sell', 'dividend')),
  symbol text not null check (symbol ~ '^[A-Z][A-Z0-9.-]{0,9}$'),
  account text not null default 'Brokerage'
    check (account in ('Brokerage', '401(k)', 'IRA', 'Roth IRA', 'HSA', 'Other')),
  -- Buys and sells: shares and price per share. An opening buy may have no price (cost unknown).
  shares numeric(18, 6) check (shares is null or shares > 0),
  price numeric(14, 4) check (price is null or price >= 0),
  fees numeric(10, 2) not null default 0 check (fees >= 0),
  -- Dividends: the cash received.
  amount numeric(14, 2) check (amount is null or amount > 0),
  note text check (note is null or length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_shape check (
    (type in ('buy', 'sell') and shares is not null and amount is null and (type = 'buy' or price is not null))
    or (type = 'dividend' and amount is not null and shares is null and price is null)
  )
);

create index if not exists trades_user_idx on public.trades (user_id, date);
alter table public.trades enable row level security;

drop policy if exists "Users read their own trades" on public.trades;
create policy "Users read their own trades" on public.trades
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create their own trades" on public.trades;
create policy "Users create their own trades" on public.trades
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users change their own trades" on public.trades;
create policy "Users change their own trades" on public.trades
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete their own trades" on public.trades;
create policy "Users delete their own trades" on public.trades
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists trades_touch on public.trades;
create trigger trades_touch before update on public.trades
  for each row execute function public.touch_updated_at();

revoke all on public.trades from anon;
grant select, insert, update, delete on public.trades to authenticated;
grant all on public.trades to service_role;

-- Carry existing hand-entered holdings over as opening buys (price = cost / shares when known).
-- The holdings table is left in place but no longer used by the app.
insert into public.trades (id, user_id, date, type, symbol, account, shares, price, note, created_at)
select
  'opening-' || h.id,
  h.user_id,
  h.created_at::date,
  'buy',
  h.symbol,
  h.account,
  h.shares,
  case when h.cost_basis is null then null else round(h.cost_basis / h.shares, 4) end,
  'Opening balance (from holdings)',
  h.created_at
from public.holdings h
on conflict (id) do nothing;
