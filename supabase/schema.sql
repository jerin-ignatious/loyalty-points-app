-- Loyalty Points App — Supabase schema
-- Run this in the Supabase SQL editor. See docs/lld.md for full rationale.

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table customers (
  id uuid primary key default gen_random_uuid() references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  phone text,
  qr_token uuid not null default gen_random_uuid() unique,
  points_balance int not null default 0,
  created_at timestamptz not null default now(),
  constraint customer_has_contact check (email is not null)
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

-- ---------- Atomic transaction function ----------
-- See docs/lld.md Section 5. This is the only path allowed to change points_balance.

create or replace function apply_transaction(
  p_customer_id uuid,
  p_staff_id uuid,
  p_type text,
  p_points int, -- always positive magnitude; sign decided below
  p_note text
) returns table(transaction_id uuid, new_balance int) as $$
declare
  v_signed_points int;
  v_new_balance int;
  v_transaction_id uuid;
begin
  if p_type not in ('earn', 'redeem', 'adjustment') then
    raise exception 'invalid_type';
  end if;

  if (p_type in ('redeem', 'adjustment')) and (p_note is null or trim(p_note) = '') then
    raise exception 'note_required';
  end if;

  v_signed_points := case when p_type = 'earn' then p_points else -p_points end;

  select points_balance + v_signed_points into v_new_balance
  from customers where id = p_customer_id for update;

  if v_new_balance is null then
    raise exception 'customer_not_found';
  end if;

  if p_type = 'redeem' and v_new_balance < 0 then
    raise exception 'insufficient_balance';
  end if;

  insert into transactions (customer_id, staff_id, type, points, note)
  values (p_customer_id, p_staff_id, p_type, v_signed_points, p_note)
  returning id into v_transaction_id;

  update customers set points_balance = v_new_balance where id = p_customer_id;

  return query select v_transaction_id, v_new_balance;
end;
$$ language plpgsql security definer;

-- ---------- Row Level Security ----------

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

-- Transactions are only ever written via apply_transaction() (security definer),
-- never directly by the client — no insert policy is granted to authenticated users.

create policy staff_read_self on staff
  for select using (auth.uid() = id);
