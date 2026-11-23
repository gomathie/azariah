-- Salon as a kind of shop, with its own starting categories.
-- A new salon gets: money-in categories Hair, Nails and beauty, Products sold;
-- extra spending categories Tools and repairs, Towels and cleaning;
-- and a stock category Hair and beauty supplies. Existing shops are not changed.

alter table public.businesses drop constraint businesses_business_type_check;
alter table public.businesses add constraint businesses_business_type_check
  check (business_type in ('retail', 'food', 'services', 'salon', 'other'));

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
     or v_type not in ('retail', 'food', 'services', 'salon', 'other')
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
      ('services', 'Jobs', 1), ('services', 'Advance payments', 2),
      ('salon', 'Hair', 1), ('salon', 'Nails and beauty', 2), ('salon', 'Products sold', 3)
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
      ('food', 'Gas and fuel', 6), ('services', 'Tools and repairs', 6),
      ('salon', 'Tools and repairs', 6), ('salon', 'Towels and cleaning', 7)
    ) as v(bt, n, ord) where bt = v_type
  ) as t(bt, n, ord);

  -- stock purchase categories
  insert into public.categories (business_id, kind, name, sort_order)
  select v_business_id, 'stock_purchase', n, 0 from (values (
    case v_type when 'retail' then 'Goods for resale'
                when 'food' then 'Ingredients'
                when 'services' then 'Materials'
                when 'salon' then 'Hair and beauty supplies'
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
