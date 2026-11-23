-- Admin rights (ADR-011, which replaces the consent rule of ADR-009 by the owner's decision).
--
-- What changes:
--   1. A platform admin no longer needs the shop owner's permission to open a shop.
--   2. Admins have rights, given and taken away by a superadmin:
--        view_shops     open any shop and look
--        edit_shops     open any shop and add or change anything its owner could (includes looking)
--        suspend_shops  suspend or reactivate a shop
--        billing        discount codes, the payments switch and plan prices
--      A superadmin has every right and is the only one who can add, change or remove admins.
--   3. What stays: an admin must OPEN a shop before reading it, the opening is logged against the
--      admin and lasts two hours, the owner can see the record, and everything an admin writes is
--      stored under the admin's own user id, never the owner's. Nobody signs in as someone else.
--   4. Rights are checked live on every read and write, so taking a right away works at once.

-- ---------------------------------------------------------------------------
-- rights
-- ---------------------------------------------------------------------------
alter table public.platform_admins
  add column is_super boolean not null default false,
  add column rights text[] not null default '{}'
    check (rights <@ array['view_shops', 'edit_shops', 'suspend_shops', 'billing']::text[]),
  add column added_by uuid references auth.users (id) on delete set null;

-- Admins that exist today were added by hand by whoever holds the database: they are the superadmins.
update public.platform_admins set is_super = true;

create or replace function public.has_admin_right(p_right text)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.platform_admins a
    where a.user_id = auth.uid()
      and (a.is_super or p_right = any (a.rights) or (p_right = 'view_shops' and 'edit_shops' = any (a.rights)))
  );
$$;
revoke all on function public.has_admin_right(text) from public, anon, authenticated;

-- One function, with or without a right. The old no-argument version is dropped so that calls
-- written as assert_platform_admin() resolve to this one.
drop function public.assert_platform_admin();
create or replace function public.assert_platform_admin(p_right text default null)
returns void
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin()
     or (p_right is not null and not public.has_admin_right(p_right)) then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;
end $$;
revoke all on function public.assert_platform_admin(text) from public, anon, authenticated;

create or replace function public.assert_super_admin()
returns void
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from public.platform_admins where user_id = auth.uid() and is_super) then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;
end $$;
revoke all on function public.assert_super_admin() from public, anon, authenticated;

-- Existing admin functions now ask for a right. Their bodies are otherwise unchanged, so the one
-- line is swapped in place; the block fails loudly if a function no longer has that line.
do $$
declare
  v_item record;
  v_def text;
  v_old constant text := 'perform public.assert_platform_admin();';
begin
  for v_item in
    select * from (values
      ('rpc_admin_set_business_status', 'suspend_shops'),
      ('rpc_admin_create_discount_code', 'billing'),
      ('rpc_admin_list_discount_codes', 'billing'),
      ('rpc_admin_set_discount_code_active', 'billing'),
      ('rpc_admin_billing_settings', 'billing'),
      ('rpc_admin_set_payments_on', 'billing'),
      ('rpc_admin_update_billing_product', 'billing')
    ) as t(fn, needed)
  loop
    select pg_get_functiondef(p.oid) into strict v_def
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = v_item.fn;
    if position(v_old in v_def) = 0 then
      raise exception 'admin rights: % has no platform admin check to replace', v_item.fn;
    end if;
    execute replace(v_def, v_old, format('perform public.assert_platform_admin(%L);', v_item.needed));
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- opening a shop
-- ---------------------------------------------------------------------------
create table public.support_sessions (
  admin_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  can_edit boolean not null default false,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (admin_id, business_id)
);
alter table public.support_sessions enable row level security;
-- No grants and no policies: only the functions below touch this table.
revoke all on public.support_sessions from anon, authenticated;

-- True while this admin has the shop open and still holds the right to look.
create or replace function public.has_support_access(p_business_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.support_sessions s
    where s.admin_id = auth.uid() and s.business_id = p_business_id and s.expires_at > now()
  ) and public.has_admin_right('view_shops');
$$;
revoke all on function public.has_support_access(uuid) from public, anon;
grant execute on function public.has_support_access(uuid) to authenticated;

-- True while this admin has the shop open for changes and still holds the right to change.
create or replace function public.has_support_edit(p_business_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.support_sessions s
    where s.admin_id = auth.uid() and s.business_id = p_business_id and s.expires_at > now() and s.can_edit
  ) and public.has_admin_right('edit_shops');
$$;
revoke all on function public.has_support_edit(uuid) from public, anon;
grant execute on function public.has_support_edit(uuid) to authenticated;

-- A member passes as before. An admin with the shop open passes every read (no role asked for);
-- an admin with the shop open for changes also passes every check that names roles.
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
  ) or (
    public.has_support_access(p_business_id)
    and (p_roles is null or public.has_support_edit(p_business_id))
  );
$$;

drop function public.rpc_admin_open_business(uuid);
create or replace function public.rpc_admin_open_business(p_business_id uuid, p_edit boolean default false)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_edit boolean := coalesce(p_edit, false);
begin
  perform public.assert_platform_admin(case when v_edit then 'edit_shops' else 'view_shops' end);
  select jsonb_build_object(
    'id', b.id, 'name', b.name, 'business_type', b.business_type, 'country_code', b.country_code,
    'timezone', b.timezone, 'currency_code', b.currency_code, 'minor_unit', b.minor_unit, 'can_edit', v_edit
  ) into v_row from public.businesses b where b.id = p_business_id;
  if v_row is null then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  insert into public.support_sessions (admin_id, business_id, can_edit, expires_at)
  values (auth.uid(), p_business_id, v_edit, now() + interval '2 hours')
  on conflict (admin_id, business_id)
  do update set can_edit = excluded.can_edit, opened_at = now(), expires_at = excluded.expires_at;

  perform public.audit(p_business_id, case when v_edit then 'support.edit_opened' else 'support.viewed' end,
    'business', p_business_id, null);
  return v_row;
end $$;
revoke all on function public.rpc_admin_open_business(uuid, boolean) from public, anon;
grant execute on function public.rpc_admin_open_business(uuid, boolean) to authenticated;

create or replace function public.rpc_admin_close_business(p_business_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_platform_admin();
  delete from public.support_sessions where admin_id = auth.uid() and business_id = p_business_id;
  return jsonb_build_object('closed', true);
end $$;
revoke all on function public.rpc_admin_close_business(uuid) from public, anon;
grant execute on function public.rpc_admin_close_business(uuid) to authenticated;

-- The owner no longer gives or takes back access. Old grants stay in the table as history.
drop function public.rpc_grant_support_access(uuid, integer, text);
drop function public.rpc_revoke_support_access(uuid);

-- ---------------------------------------------------------------------------
-- who am I, and managing admins (superadmin only)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_admin_whoami()
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'is_platform_admin', a.user_id is not null,
    'is_super', coalesce(a.is_super, false),
    'rights', case
      when a.user_id is null then '[]'::jsonb
      when a.is_super then '["view_shops","edit_shops","suspend_shops","billing"]'::jsonb
      else to_jsonb(a.rights) end
  )
  from (select auth.uid() as uid) me
  left join public.platform_admins a on a.user_id = me.uid;
$$;
revoke all on function public.rpc_admin_whoami() from public, anon;
grant execute on function public.rpc_admin_whoami() to authenticated;

create or replace function public.rpc_admin_list_admins()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_super_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', a.user_id, 'email', u.email, 'is_super', a.is_super, 'rights', to_jsonb(a.rights),
      'note', a.note, 'created_at', a.created_at, 'is_me', a.user_id = auth.uid()
    ) order by a.is_super desc, a.created_at)
    from public.platform_admins a join auth.users u on u.id = a.user_id
  ), '[]'::jsonb);
end $$;
revoke all on function public.rpc_admin_list_admins() from public, anon;
grant execute on function public.rpc_admin_list_admins() to authenticated;

-- Add an admin, or change what an admin may do. The person must already have an Azaria account.
-- A superadmin cannot change their own entry, so there is always at least one superadmin.
create or replace function public.rpc_admin_save_admin(
  p_email text, p_rights text[], p_is_super boolean default false, p_note text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_rights text[];
begin
  perform public.assert_super_admin();
  if p_email is null or length(btrim(p_email)) not between 3 and 320 or p_is_super is null
     or (p_note is not null and length(p_note) > 200)
     or not (coalesce(p_rights, '{}') <@ array['view_shops', 'edit_shops', 'suspend_shops', 'billing']::text[]) then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if v_user = auth.uid() then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct r order by r), '{}') into v_rights from unnest(coalesce(p_rights, '{}')) as r;

  insert into public.platform_admins (user_id, is_super, rights, note, added_by)
  values (v_user, p_is_super, v_rights, public.clean_text(nullif(btrim(p_note), '')), auth.uid())
  on conflict (user_id) do update
    set is_super = excluded.is_super, rights = excluded.rights, note = coalesce(excluded.note, public.platform_admins.note);

  -- Rights are checked live, but an open shop should not outlast a right that was taken away.
  if not p_is_super and not ('edit_shops' = any (v_rights)) then
    if 'view_shops' = any (v_rights) then
      update public.support_sessions set can_edit = false where admin_id = v_user;
    else
      delete from public.support_sessions where admin_id = v_user;
    end if;
  end if;

  perform public.audit(null, 'admin.saved', 'platform_admin', v_user,
    jsonb_build_object('is_super', p_is_super, 'rights', v_rights));
  return jsonb_build_object('user_id', v_user, 'is_super', p_is_super, 'rights', to_jsonb(v_rights));
end $$;
revoke all on function public.rpc_admin_save_admin(text, text[], boolean, text) from public, anon;
grant execute on function public.rpc_admin_save_admin(text, text[], boolean, text) to authenticated;

create or replace function public.rpc_admin_remove_admin(p_user_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_super_admin();
  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  delete from public.platform_admins where user_id = p_user_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  delete from public.support_sessions where admin_id = p_user_id;
  perform public.audit(null, 'admin.removed', 'platform_admin', p_user_id, null);
  return jsonb_build_object('removed', true);
end $$;
revoke all on function public.rpc_admin_remove_admin(uuid) from public, anon;
grant execute on function public.rpc_admin_remove_admin(uuid) to authenticated;
