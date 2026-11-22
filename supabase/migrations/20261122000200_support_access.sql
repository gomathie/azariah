-- Platform support access (ADR-009).
--
-- A platform admin is a person on the Azaria team who helps when something goes wrong.
-- Rules this migration enforces:
--   1. Being a platform admin does NOT open any shop's books. Without the owner's say-so an admin
--      sees only a directory: shop name, country, status, owner email, last activity date.
--   2. An owner can grant support access to their shop for a limited time (1 hour to 7 days) and
--      can take it back at any moment.
--   3. While a grant is live, an admin can READ that one shop. They can never write: every write
--      goes through an rpc_* function or a policy that names roles, and an admin has no role.
--   4. An admin can suspend or reactivate a shop, with a reason. Suspension blocks its members.
--   5. Every grant, revoke, look and status change is written to audit_events.
--   6. Admins are added only with SQL by whoever holds the database. There is no API to become one.

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
-- No grants and no policies: the API cannot read or change this table at all.
revoke all on public.platform_admins from anon, authenticated;

create table public.support_grants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  granted_by uuid not null references auth.users (id),
  reason text check (reason is null or length(reason) <= 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id),
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '7 days')
);
create index support_grants_business_idx on public.support_grants (business_id, expires_at desc);
alter table public.support_grants enable row level security;
revoke all on public.support_grants from anon, authenticated;
grant select on public.support_grants to authenticated;
-- Owners and managers can see who was given access to their shop. Writes go through the RPCs below.
create policy support_grants_select_owner on public.support_grants
  for select to authenticated using (public.is_member(business_id, '{owner,manager}'));

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- True only for a platform admin, and only while the shop's owner has a live, unrevoked grant.
create or replace function public.has_support_access(p_business_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
     and exists (
       select 1 from public.support_grants g
       where g.business_id = p_business_id and g.revoked_at is null and g.expires_at > now()
     );
$$;
revoke all on function public.has_support_access(uuid) from public, anon;
grant execute on function public.has_support_access(uuid) to authenticated;

-- is_member gains one read-only door. Support access counts ONLY when no role is asked for
-- (p_roles is null), which is how every read policy and read function calls it. Every write names
-- the roles it accepts, so support access can never satisfy a write. Tests in 0016 pin this.
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
  ) or (p_roles is null and public.has_support_access(p_business_id));
$$;

create or replace function public.assert_platform_admin()
returns void
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;
end $$;
revoke all on function public.assert_platform_admin() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- owner side: grant, revoke, see
-- ---------------------------------------------------------------------------
create or replace function public.rpc_grant_support_access(
  p_business_id uuid, p_hours integer default 24, p_reason text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_expires timestamptz;
begin
  perform public.assert_member(p_business_id, '{owner}');
  if p_hours is null or p_hours < 1 or p_hours > 168 or (p_reason is not null and length(p_reason) > 500) then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  -- One live grant per shop: a new one replaces the old one.
  update public.support_grants set revoked_at = now(), revoked_by = auth.uid()
  where business_id = p_business_id and revoked_at is null and expires_at > now();

  v_expires := now() + make_interval(hours => p_hours);
  insert into public.support_grants (business_id, granted_by, reason, expires_at)
  values (p_business_id, auth.uid(), nullif(btrim(p_reason), ''), v_expires)
  returning id into v_id;

  perform public.audit(p_business_id, 'support.granted', 'support_grant', v_id,
    jsonb_build_object('hours', p_hours, 'expires_at', v_expires));
  return jsonb_build_object('id', v_id, 'expires_at', v_expires);
end $$;
revoke all on function public.rpc_grant_support_access(uuid, integer, text) from public, anon;
grant execute on function public.rpc_grant_support_access(uuid, integer, text) to authenticated;

create or replace function public.rpc_revoke_support_access(p_business_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  perform public.assert_member(p_business_id, '{owner}');
  update public.support_grants set revoked_at = now(), revoked_by = auth.uid()
  where business_id = p_business_id and revoked_at is null and expires_at > now();
  get diagnostics v_count = row_count;
  if v_count > 0 then
    perform public.audit(p_business_id, 'support.revoked', 'business', p_business_id, null);
  end if;
  return jsonb_build_object('revoked', v_count);
end $$;
revoke all on function public.rpc_revoke_support_access(uuid) from public, anon;
grant execute on function public.rpc_revoke_support_access(uuid) to authenticated;

-- The live grant, if any, and the last 20 support events, so an owner can see what support did.
create or replace function public.rpc_list_support_access(p_business_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_member(p_business_id, '{owner,manager}');
  return jsonb_build_object(
    'active', (
      select jsonb_build_object('id', g.id, 'expires_at', g.expires_at, 'created_at', g.created_at, 'reason', g.reason)
      from public.support_grants g
      where g.business_id = p_business_id and g.revoked_at is null and g.expires_at > now()
      order by g.expires_at desc limit 1
    ),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('action', e.action, 'at', e.created_at) order by e.created_at desc)
      from (
        select action, created_at from public.audit_events
        where business_id = p_business_id and action like 'support.%'
        order by created_at desc limit 20
      ) e
    ), '[]'::jsonb)
  );
end $$;
revoke all on function public.rpc_list_support_access(uuid) from public, anon;
grant execute on function public.rpc_list_support_access(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin side
-- ---------------------------------------------------------------------------
create or replace function public.rpc_admin_whoami()
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('is_platform_admin', public.is_platform_admin());
$$;
revoke all on function public.rpc_admin_whoami() from public, anon;
grant execute on function public.rpc_admin_whoami() to authenticated;

-- The shop directory. No sales, balances, customers or entries: only what support needs to find a
-- shop and see whether it is alive. Newest first; pass the last created_at as p_before for the next page.
create or replace function public.rpc_admin_list_businesses(
  p_search text default null, p_limit integer default 25, p_before timestamptz default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_term text := nullif(btrim(coalesce(p_search, '')), '');
  v_like text;
  v_rows jsonb;
begin
  perform public.assert_platform_admin();
  if v_term is not null then
    if length(v_term) > 100 then
      raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
    end if;
    -- The search text is data, never a pattern: % and _ are matched literally.
    v_like := '%' || replace(replace(replace(v_term, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    perform public.audit(null, 'support.searched', 'business', null, jsonb_build_object('term', v_term));
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v_rows
  from (
    select
      b.id, b.name, b.business_type, b.country_code, b.currency_code, b.status, b.created_at,
      u.email as owner_email,
      (select count(*) from public.business_memberships m where m.business_id = b.id and m.status = 'active') as member_count,
      (select max(t.business_date) from public.transactions t where t.business_id = b.id) as last_entry_date,
      (select max(g.expires_at) from public.support_grants g
        where g.business_id = b.id and g.revoked_at is null and g.expires_at > now()) as support_expires_at
    from public.businesses b
    left join auth.users u on u.id = b.created_by
    where (p_before is null or b.created_at < p_before)
      and (v_like is null or b.name ilike v_like escape '\' or u.email ilike v_like escape '\')
    order by b.created_at desc
    limit v_limit
  ) x;
  return v_rows;
end $$;
revoke all on function public.rpc_admin_list_businesses(text, integer, timestamptz) from public, anon;
grant execute on function public.rpc_admin_list_businesses(text, integer, timestamptz) to authenticated;

-- Suspend or reactivate a shop. A suspended shop's members are locked out by is_member.
create or replace function public.rpc_admin_set_business_status(
  p_business_id uuid, p_status text, p_reason text
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_old text;
begin
  perform public.assert_platform_admin();
  if p_status not in ('active', 'suspended') or p_reason is null
     or length(btrim(p_reason)) < 3 or length(p_reason) > 500 then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  select status into v_old from public.businesses where id = p_business_id for update;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  update public.businesses set status = p_status where id = p_business_id;
  perform public.audit(p_business_id, 'support.status_changed', 'business', p_business_id,
    jsonb_build_object('from', v_old, 'to', p_status, 'reason', btrim(p_reason)));
  return jsonb_build_object('id', p_business_id, 'status', p_status);
end $$;
revoke all on function public.rpc_admin_set_business_status(uuid, text, text) from public, anon;
grant execute on function public.rpc_admin_set_business_status(uuid, text, text) to authenticated;

-- Start a read-only look at one shop. Refused unless the owner's grant is live. Each look is logged.
create or replace function public.rpc_admin_open_business(p_business_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
begin
  perform public.assert_platform_admin();
  if not public.has_support_access(p_business_id) then
    raise exception 'AZ_SUPPORT_NOT_GRANTED' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'id', b.id, 'name', b.name, 'business_type', b.business_type, 'country_code', b.country_code,
    'timezone', b.timezone, 'currency_code', b.currency_code, 'minor_unit', b.minor_unit
  ) into v_row from public.businesses b where b.id = p_business_id;
  perform public.audit(p_business_id, 'support.viewed', 'business', p_business_id, null);
  return v_row;
end $$;
revoke all on function public.rpc_admin_open_business(uuid) from public, anon;
grant execute on function public.rpc_admin_open_business(uuid) to authenticated;
