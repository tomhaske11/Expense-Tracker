-- expenseAI: initial schema. Every row belongs to one user (auth.users), and row-level
-- security limits each user to their own rows. Run once per project (SQL Editor or
-- `supabase db push`). Safe to re-run: objects are created only if missing.

-- ---------- Expenses ----------
create table if not exists public.expenses (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Client-generated id (kept from the localStorage era so imported data keeps its ids).
  id text not null check (char_length(id) between 1 and 100),
  date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null check (category in ('Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Other')),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  -- Where an imported expense came from: { kind, externalId, connectionId?, accountId?, rawDescription? }.
  source jsonb check (source is null or (source ? 'kind' and source ? 'externalId')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);
-- The same bank/statement transaction can only be imported once per user.
create unique index if not exists expenses_user_external_id_idx
  on public.expenses (user_id, (source ->> 'externalId'))
  where source is not null;

alter table public.expenses enable row level security;

drop policy if exists "Users read their own expenses" on public.expenses;
create policy "Users read their own expenses" on public.expenses
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users add their own expenses" on public.expenses;
create policy "Users add their own expenses" on public.expenses
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users change their own expenses" on public.expenses;
create policy "Users change their own expenses" on public.expenses
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete their own expenses" on public.expenses;
create policy "Users delete their own expenses" on public.expenses
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Settings (one row per user) ----------
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  daily_budget numeric(10, 2) not null default 50 check (daily_budget > 0),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users read their own settings" on public.user_settings;
create policy "Users read their own settings" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create their own settings" on public.user_settings;
create policy "Users create their own settings" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users change their own settings" on public.user_settings;
create policy "Users change their own settings" on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------- Bank connections (server only) ----------
-- Holds (encrypted) aggregator access tokens. RLS is enabled with NO policies, so the browser's
-- publishable key can't read or write it; only the server's secret key (which bypasses RLS) can.
create table if not exists public.bank_connections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  institution jsonb not null,
  accounts jsonb not null,
  access_token text not null,
  cursor text,
  created_at timestamptz not null default now(),
  last_synced_at timestamptz
);

create index if not exists bank_connections_user_idx on public.bank_connections (user_id);
alter table public.bank_connections enable row level security;

-- ---------- Table privileges ----------
-- Explicit grants, so access doesn't depend on the project's "expose new tables" default.
-- Row-level security above still limits signed-in users to their own rows.
revoke all on public.expenses, public.user_settings, public.bank_connections from anon;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update on public.user_settings to authenticated;
revoke all on public.bank_connections from authenticated;
grant all on public.expenses, public.user_settings, public.bank_connections to service_role;

-- ---------- updated_at ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch before update on public.expenses
  for each row execute function public.touch_updated_at();
drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ---------- Live sync between a user's devices ----------
-- Realtime respects RLS: each user only receives changes to their own rows.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expenses'
  ) then
    alter publication supabase_realtime add table public.expenses;
  end if;
end;
$$;
