-- Idempotency helpers shared by all rpc_* functions (ADR-002) and the business provisioning RPC.

-- Returns the stored result if this client operation was already committed, else null.
create or replace function public.sync_replay(p_client_operation_id uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select result from public.sync_operations
  where client_operation_id = p_client_operation_id and status = 'committed';
$$;
revoke all on function public.sync_replay(uuid) from public, anon, authenticated;

-- Records a committed operation. Raises unique_violation if a concurrent call already recorded it;
-- callers catch that and return sync_replay().
create or replace function public.sync_record(
  p_business_id uuid, p_client_operation_id uuid, p_kind text, p_result jsonb
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.sync_operations (business_id, client_operation_id, kind, actor_id, result)
  values (p_business_id, p_client_operation_id, p_kind, auth.uid(), p_result);
  return p_result;
end $$;
revoke all on function public.sync_record(uuid, uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.audit(
  p_business_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_data jsonb default null
) returns void
language sql security definer
set search_path = public, pg_temp
as $$
  insert into public.audit_events (business_id, actor_id, action, entity_type, entity_id, data)
  values (p_business_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_data);
$$;
revoke all on function public.audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;

-- Minor units for the currencies we seed; everything else defaults to 2.
create or replace function public.currency_minor_unit(p_currency_code text)
returns smallint
language sql immutable
set search_path = public, pg_temp
as $$
  select case
    when p_currency_code in ('XOF','XAF','UGX','RWF','BIF','GNF','DJF','KMF','JPY','KRW','VND','CLP','PYG','VUV','XPF') then 0::smallint
    else 2::smallint
  end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_create_business_and_owner
-- Creates the business, the caller's owner membership, Cash + Mobile Money accounts and default
-- categories for the business type, atomically and idempotently.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_create_business_and_owner(
  p_client_operation_id uuid,
  p_name text,
  p_business_type text,
  p_country_code text,
  p_timezone text,
  p_currency_code text
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_existing jsonb;
  v_business_id uuid;
  v_result jsonb;
  v_type text := lower(coalesce(p_business_type, 'other'));
begin
  if v_uid is null then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;

  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  if p_client_operation_id is null
     or p_name is null or length(btrim(p_name)) not between 1 and 120
     or v_type not in ('retail', 'food', 'services', 'other')
     or p_country_code !~ '^[A-Z]{2}$'
     or p_currency_code !~ '^[A-Z]{3}$'
     or p_timezone is null or not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  insert into public.businesses (name, business_type, country_code, timezone, currency_code, minor_unit, created_by)
  values (btrim(p_name), v_type, p_country_code, p_timezone, p_currency_code,
          public.currency_minor_unit(p_currency_code), v_uid)
  returning id into v_business_id;

  insert into public.business_memberships (business_id, user_id, role, status)
  values (v_business_id, v_uid, 'owner', 'active');

  insert into public.business_preferences (business_id) values (v_business_id);

  insert into public.money_accounts (business_id, name, type, currency_code, is_default, sort_order) values
    (v_business_id, 'Cash', 'cash', p_currency_code, true, 0),
    (v_business_id, 'Mobile Money', 'mobile_money', p_currency_code, false, 1);

  -- sale categories
  insert into public.categories (business_id, kind, name, sort_order)
  select v_business_id, 'sale', n, ord from (values
    ('Sales', 0)
  ) as t(n, ord);
  insert into public.categories (business_id, kind, name, sort_order)
  select v_business_id, 'sale', n, ord from (
    select * from (values
      ('retail', 'Goods sold', 1),
      ('food', 'Meals', 1), ('food', 'Drinks', 2), ('food', 'Event orders', 3),
      ('services', 'Jobs', 1), ('services', 'Advance payments', 2)
    ) as v(bt, n, ord) where bt = v_type
  ) as t(bt, n, ord);

  -- operating expense categories
  insert into public.categories (business_id, kind, name, sort_order)
  select v_business_id, 'operating_expense', n, ord from (values
    ('Rent', 0), ('Transport', 1), ('Airtime and data', 2), ('Packaging', 3),
    ('Electricity and water', 4), ('Wages', 5), ('Other expense', 9)
  ) as t(n, ord);
  insert into public.categories (business_id, kind, name, sort_order)
  select v_business_id, 'operating_expense', n, ord from (
    select * from (values
      ('food', 'Gas and fuel', 6), ('services', 'Tools and repairs', 6)
    ) as v(bt, n, ord) where bt = v_type
  ) as t(bt, n, ord);

  -- stock purchase categories
  insert into public.categories (business_id, kind, name, sort_order)
  select v_business_id, 'stock_purchase', n, 0 from (values (
    case v_type when 'retail' then 'Goods for resale'
                when 'food' then 'Ingredients'
                when 'services' then 'Materials'
                else 'Stock' end
  )) as t(n);

  perform public.audit(v_business_id, 'business.created', 'business', v_business_id,
                       jsonb_build_object('name', btrim(p_name), 'business_type', v_type));

  v_result := jsonb_build_object('business_id', v_business_id);
  return public.sync_record(v_business_id, p_client_operation_id, 'create_business', v_result);
exception
  when unique_violation then
    -- A concurrent call with the same client_operation_id won the race; return its result.
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end $$;

revoke all on function public.rpc_create_business_and_owner(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.rpc_create_business_and_owner(uuid, text, text, text, text, text) to authenticated;
