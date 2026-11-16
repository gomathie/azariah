-- Tenant isolation (ADR-004): membership helpers, RLS on every table, explicit grants, policies.
-- config.toml sets auto_expose_new_tables = false, so nothing is reachable without a GRANT here.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_member(p_business_id uuid, p_roles public.business_role[] default null)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.business_memberships m
    join public.businesses b on b.id = m.business_id
    where m.business_id = p_business_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and b.status = 'active'
      and (p_roles is null or m.role = any (p_roles))
  );
$$;
revoke all on function public.is_member(uuid, public.business_role[]) from public, anon;
grant execute on function public.is_member(uuid, public.business_role[]) to authenticated;

create or replace function public.assert_member(p_business_id uuid, p_roles public.business_role[] default null)
returns void
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or p_business_id is null or not public.is_member(p_business_id, p_roles) then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;
end $$;
revoke all on function public.assert_member(uuid, public.business_role[]) from public, anon;
grant execute on function public.assert_member(uuid, public.business_role[]) to authenticated;

-- ---------------------------------------------------------------------------
-- enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.business_preferences enable row level security;
alter table public.money_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.contacts enable row level security;
alter table public.transactions enable row level security;
alter table public.money_movements enable row level security;
alter table public.receivables enable row level security;
alter table public.credit_allocations enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_events enable row level security;
alter table public.sync_operations enable row level security;

-- ---------------------------------------------------------------------------
-- grants: anon gets nothing; authenticated gets reads plus writes on settings tables only.
-- Financial tables (transactions, money_movements, receivables, credit_allocations) are written
-- only by rpc_* functions. audit_events and sync_operations are not exposed at all.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on
  public.profiles, public.businesses, public.business_memberships, public.business_preferences,
  public.money_accounts, public.categories, public.contacts,
  public.transactions, public.money_movements, public.receivables, public.credit_allocations,
  public.attachments, public.v_account_balances, public.v_customer_balances
to authenticated;

grant update (display_name, locale) on public.profiles to authenticated;
grant update (name, business_type, country_code, timezone) on public.businesses to authenticated;
grant insert, update on public.business_preferences to authenticated;
grant insert, update on public.money_accounts to authenticated;
grant insert, update on public.categories to authenticated;
grant insert, update on public.contacts to authenticated;

-- ---------------------------------------------------------------------------
-- policies
-- ---------------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy businesses_select_member on public.businesses
  for select to authenticated using (public.is_member(id));
create policy businesses_update_owner on public.businesses
  for update to authenticated using (public.is_member(id, '{owner}')) with check (public.is_member(id, '{owner}'));

create policy memberships_select_member on public.business_memberships
  for select to authenticated using (public.is_member(business_id));

create policy preferences_select_member on public.business_preferences
  for select to authenticated using (public.is_member(business_id));
create policy preferences_write_manager on public.business_preferences
  for insert to authenticated with check (public.is_member(business_id, '{owner,manager}'));
create policy preferences_update_manager on public.business_preferences
  for update to authenticated using (public.is_member(business_id, '{owner,manager}'))
  with check (public.is_member(business_id, '{owner,manager}'));

create policy money_accounts_select_member on public.money_accounts
  for select to authenticated using (public.is_member(business_id));
create policy money_accounts_insert_manager on public.money_accounts
  for insert to authenticated with check (public.is_member(business_id, '{owner,manager}'));
create policy money_accounts_update_manager on public.money_accounts
  for update to authenticated using (public.is_member(business_id, '{owner,manager}'))
  with check (public.is_member(business_id, '{owner,manager}'));

create policy categories_select_member on public.categories
  for select to authenticated using (public.is_member(business_id));
create policy categories_insert_manager on public.categories
  for insert to authenticated with check (public.is_member(business_id, '{owner,manager}'));
create policy categories_update_manager on public.categories
  for update to authenticated using (public.is_member(business_id, '{owner,manager}'))
  with check (public.is_member(business_id, '{owner,manager}'));

-- Staff add customers while selling, so contacts are writable by staff too.
create policy contacts_select_member on public.contacts
  for select to authenticated using (public.is_member(business_id));
create policy contacts_insert_staff on public.contacts
  for insert to authenticated with check (public.is_member(business_id, '{owner,manager,staff}'));
create policy contacts_update_staff on public.contacts
  for update to authenticated using (public.is_member(business_id, '{owner,manager,staff}'))
  with check (public.is_member(business_id, '{owner,manager,staff}'));

create policy transactions_select_member on public.transactions
  for select to authenticated using (public.is_member(business_id));
create policy money_movements_select_member on public.money_movements
  for select to authenticated using (public.is_member(business_id));
create policy receivables_select_member on public.receivables
  for select to authenticated using (public.is_member(business_id));
create policy credit_allocations_select_member on public.credit_allocations
  for select to authenticated using (public.is_member(business_id));
create policy attachments_select_member on public.attachments
  for select to authenticated using (public.is_member(business_id));

-- audit_events and sync_operations: no policies, no grants -> not readable or writable via the API.
