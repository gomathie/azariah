-- Azaria core schema (ADR-001 money as bigint minor units, ADR-003 event + movement model, ADR-005 business_date)
-- Every business-owned table carries business_id. RLS, grants and policies are in 20261116000200_rls.sql.

create type public.business_role as enum ('owner', 'manager', 'staff', 'viewer');
create type public.membership_status as enum ('active', 'invited', 'removed');
create type public.account_type as enum ('cash', 'mobile_money', 'bank', 'other');
create type public.category_kind as enum ('sale', 'operating_expense', 'stock_purchase');
create type public.transaction_kind as enum (
  'sale', 'collection', 'expense', 'stock_purchase', 'transfer',
  'owner_contribution', 'owner_withdrawal', 'opening_balance', 'reversal'
);
create type public.transaction_status as enum ('posted', 'reversed');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- profiles: non-sensitive user profile mirrored from auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'en' check (locale in ('en', 'fr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- businesses and memberships
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  business_type text not null default 'other' check (business_type in ('retail', 'food', 'services', 'other')),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  timezone text not null,
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),
  minor_unit smallint not null default 2 check (minor_unit between 0 and 4),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger businesses_set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

create table public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.business_role not null default 'staff',
  status public.membership_status not null default 'active',
  invited_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index business_memberships_user_idx on public.business_memberships (user_id) where status = 'active';
create trigger business_memberships_set_updated_at before update on public.business_memberships
  for each row execute function public.set_updated_at();

create table public.business_preferences (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger business_preferences_set_updated_at before update on public.business_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reference data owned by a business
-- ---------------------------------------------------------------------------
create table public.money_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  type public.account_type not null,
  currency_code char(3) not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);
create index money_accounts_business_idx on public.money_accounts (business_id, sort_order);
create trigger money_accounts_set_updated_at before update on public.money_accounts
  for each row execute function public.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind public.category_kind not null,
  name text not null check (length(btrim(name)) between 1 and 60),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, kind, name)
);
create index categories_business_idx on public.categories (business_id, kind, sort_order);
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  phone text,
  kind text not null default 'customer' check (kind in ('customer', 'supplier', 'both')),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_business_idx on public.contacts (business_id, name);
create trigger contacts_set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- financial events
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind public.transaction_kind not null,
  status public.transaction_status not null default 'posted',
  occurred_at timestamptz not null,
  business_date date not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency_code char(3) not null,
  category_id uuid references public.categories (id),
  contact_id uuid references public.contacts (id),
  description text check (description is null or length(description) <= 240),
  note text check (note is null or length(note) <= 1000),
  reference text,
  reverses_transaction_id uuid references public.transactions (id),
  reversed_by_transaction_id uuid references public.transactions (id),
  client_operation_id uuid not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, client_operation_id),
  check ((kind = 'reversal') = (reverses_transaction_id is not null))
);
create index transactions_business_date_idx on public.transactions (business_id, business_date desc, created_at desc);
create index transactions_business_kind_idx on public.transactions (business_id, kind, business_date);
create index transactions_contact_idx on public.transactions (business_id, contact_id) where contact_id is not null;
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- One signed row per money account touched by a transaction. Balance = sum(amount_minor).
create table public.money_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  money_account_id uuid not null references public.money_accounts (id),
  amount_minor bigint not null check (amount_minor <> 0),
  occurred_at timestamptz not null,
  business_date date not null,
  created_at timestamptz not null default now()
);
create index money_movements_account_idx on public.money_movements (business_id, money_account_id, business_date);
create index money_movements_transaction_idx on public.money_movements (transaction_id);

-- One row per credit sale; outstanding = amount_minor - sum(credit_allocations.amount_minor).
create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  transaction_id uuid not null unique references public.transactions (id) on delete cascade,
  contact_id uuid not null references public.contacts (id),
  amount_minor bigint not null check (amount_minor > 0),
  due_date date,
  status text not null default 'open' check (status in ('open', 'settled', 'reversed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index receivables_contact_idx on public.receivables (business_id, contact_id, status);
create trigger receivables_set_updated_at before update on public.receivables
  for each row execute function public.set_updated_at();

create table public.credit_allocations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  receivable_id uuid not null references public.receivables (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  amount_minor bigint not null check (amount_minor <> 0),
  created_at timestamptz not null default now()
);
create index credit_allocations_receivable_idx on public.credit_allocations (receivable_id);
create index credit_allocations_transaction_idx on public.credit_allocations (transaction_id);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index attachments_transaction_idx on public.attachments (business_id, transaction_id);

-- ---------------------------------------------------------------------------
-- audit and idempotency
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  data jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_business_idx on public.audit_events (business_id, created_at desc);

-- client_operation_id is a client-generated UUID; it is globally unique, which also satisfies
-- the (business_id, client_operation_id) replay key from the spec.
create table public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  client_operation_id uuid not null unique,
  kind text not null,
  actor_id uuid,
  status text not null default 'committed' check (status in ('committed', 'failed')),
  result jsonb,
  created_at timestamptz not null default now()
);
create index sync_operations_business_idx on public.sync_operations (business_id, created_at desc);

-- ---------------------------------------------------------------------------
-- derived balances (never stored)
-- ---------------------------------------------------------------------------
create view public.v_account_balances with (security_invoker = true) as
select
  ma.business_id,
  ma.id as money_account_id,
  ma.name,
  ma.type,
  ma.currency_code,
  ma.is_default,
  ma.is_active,
  ma.sort_order,
  coalesce(sum(mm.amount_minor), 0)::bigint as balance_minor
from public.money_accounts ma
left join public.money_movements mm on mm.money_account_id = ma.id
group by ma.id;

create view public.v_customer_balances with (security_invoker = true) as
select
  r.business_id,
  r.contact_id,
  (sum(r.amount_minor) - coalesce(sum(a.allocated_minor), 0))::bigint as outstanding_minor
from public.receivables r
left join (
  select receivable_id, sum(amount_minor) as allocated_minor
  from public.credit_allocations
  group by receivable_id
) a on a.receivable_id = r.id
where r.status <> 'reversed'
group by r.business_id, r.contact_id;
