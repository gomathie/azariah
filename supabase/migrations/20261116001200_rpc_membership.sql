-- Invite and change access. Only an owner may grant the owner role. Staff cannot change access.

create or replace function public.rpc_invite_member(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_email text,
  p_role text
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_caller public.business_role;
  v_user uuid;
  v_role public.business_role;
  v_id uuid;
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner,manager}');
  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  if p_client_operation_id is null or p_email is null or position('@' in p_email) = 0
     or p_role not in ('owner', 'manager', 'staff', 'viewer') then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  select role into v_caller from public.business_memberships
  where business_id = p_business_id and user_id = auth.uid() and status = 'active';
  if p_role = 'owner' and v_caller <> 'owner' then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;

  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  v_role := p_role::public.business_role;
  insert into public.business_memberships (business_id, user_id, role, status, invited_email)
  values (p_business_id, v_user, v_role, 'active', lower(btrim(p_email)))
  returning id into v_id;

  perform public.audit(p_business_id, 'membership.invited', 'business_membership', v_id,
    jsonb_build_object('role', p_role));
  v_result := jsonb_build_object('membership_id', v_id, 'user_id', v_user, 'role', p_role);
  return public.sync_record(p_business_id, p_client_operation_id, 'invite_member', v_result);
exception
  when unique_violation then
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
end $$;

create or replace function public.rpc_change_membership(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_membership_id uuid,
  p_role text default null,
  p_status text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_caller public.business_role;
  v_row public.business_memberships%rowtype;
  v_owners int;
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner,manager}');
  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;
  if p_client_operation_id is null or (p_role is null and p_status is null) then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  if p_role is not null and p_role not in ('owner', 'manager', 'staff', 'viewer') then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  if p_status is not null and p_status not in ('active', 'invited', 'removed') then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  select role into v_caller from public.business_memberships
  where business_id = p_business_id and user_id = auth.uid() and status = 'active';
  if p_role = 'owner' and v_caller <> 'owner' then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_row from public.business_memberships
  where id = p_membership_id and business_id = p_business_id for update;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  if v_row.role = 'owner' and v_row.status = 'active'
     and (coalesce(p_role, 'owner') <> 'owner' or coalesce(p_status, 'active') <> 'active') then
    select count(*) into v_owners from public.business_memberships
    where business_id = p_business_id and role = 'owner' and status = 'active';
    if v_owners < 2 then
      raise exception 'AZ_FORBIDDEN' using errcode = '42501';
    end if;
  end if;

  update public.business_memberships
  set role = coalesce(p_role::public.business_role, role),
      status = coalesce(p_status::public.membership_status, status)
  where id = v_row.id;

  perform public.audit(p_business_id, 'membership.changed', 'business_membership', v_row.id,
    jsonb_build_object('role', p_role, 'status', p_status));
  v_result := jsonb_build_object('membership_id', v_row.id, 'role', coalesce(p_role, v_row.role::text), 'status', coalesce(p_status, v_row.status::text));
  return public.sync_record(p_business_id, p_client_operation_id, 'change_membership', v_result);
exception
  when unique_violation then
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end $$;

revoke all on function public.rpc_invite_member(uuid, uuid, text, text) from public, anon;
revoke all on function public.rpc_change_membership(uuid, uuid, uuid, text, text) from public, anon;
grant execute on function public.rpc_invite_member(uuid, uuid, text, text) to authenticated;
grant execute on function public.rpc_change_membership(uuid, uuid, uuid, text, text) to authenticated;
