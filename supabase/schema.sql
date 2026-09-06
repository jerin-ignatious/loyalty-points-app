-- Loyalty Points App — Supabase schema
-- Plain tables + RLS only. No stored procedures / PL/pgSQL functions —
-- the atomic points-update logic lives in application code, in
-- lib/points.ts, using a direct Postgres transaction (see docs/lld.md
-- Section 5). Run this file in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table customers (
  id uuid primary key default gen_random_uuid() references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  phone text,
  qr_token uuid not null default gen_random_uuid() unique,
  points_balance int not null default 0,
  created_at timestamptz not null default now()
);

create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  created_at timestamptz not null default now()
  -- no role column: any staff login can give, redeem, and adjust points
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  staff_id uuid not null references staff(id),
  type text not null check (type in ('earn', 'redeem', 'adjustment')),
  points int not null, -- positive for earn, negative for redeem/adjustment
  note text,
  created_at timestamptz not null default now()
);

create index on transactions (customer_id, created_at desc);

-- ---------- Row Level Security ----------
-- Covers reads from the client (browser/server using the anon/user session).
-- Writes to transactions/customers.points_balance never go through this path --
-- they go through lib/points.ts on the server, over a direct DB connection
-- that authenticates as the app itself, with staff-membership already
-- verified by middleware.ts + the session check in the API route.

alter table customers enable row level security;
alter table staff enable row level security;
alter table transactions enable row level security;

create policy customer_read_own on customers
  for select using (auth.uid() = id);

create policy staff_read_any_customer on customers
  for select using (exists (select 1 from staff where staff.id = auth.uid()));

create policy customer_read_own_transactions on transactions
  for select using (auth.uid() = customer_id);

create policy staff_read_any_transaction on transactions
  for select using (exists (select 1 from staff where staff.id = auth.uid()));

create policy staff_read_self on staff
  for select using (auth.uid() = id);

-- No insert/update policies are granted on customers or transactions for the
-- anon/authenticated roles -- all writes happen server-side via lib/points.ts.