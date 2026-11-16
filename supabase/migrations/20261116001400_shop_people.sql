-- People and phones for a shop. A trader adds a person and the phone they use.
-- The role is staff or manager. Staff is the usual choice. Manager is the admin who can correct mistakes.
-- This roster does not replace business_memberships, which still decide who can sign in.

create table public.shop_people (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  device_name text not null check (length(btrim(device_name)) between 1 and 80),
  role public.business_role not null default 'staff' check (role in ('staff', 'manager')),
  created_at timestamptz not null default now()
);
create index shop_people_business_idx on public.shop_people (business_id, created_at);

alter table public.shop_people enable row level security;
revoke all on public.shop_people from anon, authenticated;
grant select on public.shop_people to authenticated;

create policy shop_people_select on public.shop_people
  for select to authenticated
  using (public.is_member(business_id));

create or replace function public.rpc_add_shop_person(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_name text,
  p_device_name text,
  p_role text
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_caller public.business_role;
  v_role public.business_role;
  v_id uuid;
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner,manager}');
  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  if p_client_operation_id is null
     or length(btrim(coalesce(p_name, ''))) < 1
     or length(btrim(coalesce(p_device_name, ''))) < 1
     or p_role not in ('staff', 'manager') then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  select role into v_caller from public.business_memberships
  where business_id = p_business_id and user_id = auth.uid() and status = 'active';
  -- Staff is the normal role. Only the owner can add an admin (stored as manager).
  if p_role = 'manager' and v_caller <> 'owner' then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;

  v_role := p_role::public.business_role;
  insert into public.shop_people (business_id, name, device_name, role)
  values (p_business_id, btrim(p_name), btrim(p_device_name), v_role)
  returning id into v_id;

  perform public.audit(p_business_id, 'shop_person.added', 'shop_person', v_id,
    jsonb_build_object('role', p_role));
  v_result := jsonb_build_object(
    'person_id', v_id,
    'name', btrim(p_name),
    'device_name', btrim(p_device_name),
    'role', p_role
  );
  return public.sync_record(p_business_id, p_client_operation_id, 'add_shop_person', v_result);
end $$;

create or replace function public.rpc_list_shop_people(p_business_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_member(p_business_id);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'device_name', device_name,
      'role', role
    ) order by created_at)
    from public.shop_people
    where business_id = p_business_id
  ), '[]'::jsonb);
end $$;

revoke all on function public.rpc_add_shop_person(uuid, uuid, text, text, text) from public, anon;
revoke all on function public.rpc_list_shop_people(uuid) from public, anon;
grant execute on function public.rpc_add_shop_person(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.rpc_list_shop_people(uuid) to authenticated;
