-- One switch for all payments, off until the platform admin turns it on.
--
-- While the switch is off: nobody is asked to pay, no trial can be started (so no shop uses up
-- its trial early), no payment can be started, and every shop counts as having Azaria Plus.
-- When the admin turns it on, every shop without paid time is asked to pay from that moment.
-- A payment that was already on its way when the switch went off is still honoured
-- (billing_apply_payment is unchanged). The admin can also change the price of each plan and
-- stop offering a plan. ADR-010 still holds: the browser grants nothing; prices live here.

create table public.billing_settings (
  id boolean primary key default true check (id),
  payments_on boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.billing_settings enable row level security;
revoke all on public.billing_settings from anon, authenticated;
insert into public.billing_settings (id) values (true);

create or replace function public.billing_payments_on() returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$ select coalesce((select payments_on from public.billing_settings), false) $$;
revoke all on function public.billing_payments_on() from public, anon, authenticated;

-- True for every member while payments are off; otherwise while paid time, plus grace, has not run out.
create or replace function public.has_plus(p_business_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.is_member(p_business_id) and (
    not public.billing_payments_on()
    or exists (
      select 1 from public.business_entitlements e
      where e.business_id = p_business_id and e.plus_until + public.billing_grace() > now()
    )
  );
$$;
revoke all on function public.has_plus(uuid) from public, anon;
grant execute on function public.has_plus(uuid) to authenticated;

create or replace function public.rpc_billing_status(p_business_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_until timestamptz;
  v_trial_used boolean := false;
  v_is_owner boolean := public.is_member(p_business_id, '{owner}');
  v_on boolean := public.billing_payments_on();
begin
  perform public.assert_member(p_business_id);
  select plus_until, trial_used into v_until, v_trial_used
  from public.business_entitlements where business_id = p_business_id;

  return jsonb_build_object(
    'payments_on', v_on,
    'plus_until', v_until,
    'has_plus', not v_on or coalesce(v_until + public.billing_grace() > now(), false),
    'in_grace', v_on and coalesce(v_until <= now() and v_until + public.billing_grace() > now(), false),
    'trial_available', v_on and not coalesce(v_trial_used, false) and v_until is null,
    'can_pay', v_on and v_is_owner,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', p.code, 'months', p.months, 'amount_minor', p.amount_minor, 'currency_code', p.currency_code
      ) order by p.sort_order)
      from public.billing_products p where p.active
    ), '[]'::jsonb),
    'payments', case when public.is_member(p_business_id, '{owner,manager}') then coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select bp.reference, bp.months, bp.amount_minor, bp.list_amount_minor, bp.percent_off,
               bp.currency_code, bp.status, bp.channel, bp.paid_at, bp.created_at
        from public.billing_payments bp
        where bp.business_id = p_business_id
          -- A checkout that was opened and abandoned is noise after a day.
          and (bp.status = 'paid' or bp.created_at > now() - interval '1 day')
        order by bp.created_at desc limit 10
      ) x
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;
revoke all on function public.rpc_billing_status(uuid) from public, anon;
grant execute on function public.rpc_billing_status(uuid) to authenticated;

create or replace function public.rpc_start_trial(p_client_operation_id uuid, p_business_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_until timestamptz := now() + interval '14 days';
begin
  perform public.assert_member(p_business_id, '{owner}');
  if not public.billing_payments_on() then
    -- Payments are switched off for everyone: nothing to buy and no trial to use up.
    raise exception 'AZ_PAYMENT_UNAVAILABLE' using errcode = '22023';
  end if;
  if p_client_operation_id is null then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.business_entitlements (business_id, plus_until, trial_used)
  values (p_business_id, v_until, true)
  on conflict (business_id) do nothing;
  if not found then
    -- A row already exists: the trial was used, or the shop has paid before.
    raise exception 'AZ_TRIAL_USED' using errcode = '22023';
  end if;

  perform public.audit(p_business_id, 'billing.trial_started', 'business', p_business_id,
    jsonb_build_object('plus_until', v_until));
  return public.sync_record(p_business_id, p_client_operation_id, 'billing_trial',
    jsonb_build_object('plus_until', v_until));
end $$;
revoke all on function public.rpc_start_trial(uuid, uuid) from public, anon;
grant execute on function public.rpc_start_trial(uuid, uuid) to authenticated;

create or replace function public.rpc_billing_start_payment(
  p_client_operation_id uuid, p_business_id uuid, p_product_code text, p_discount_code text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_product public.billing_products;
  v_code public.discount_codes;
  v_percent integer := 0;
  v_amount bigint;
  v_id uuid;
  v_reference text := 'azp-' || replace(gen_random_uuid()::text, '-', '');
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner}');
  if not public.billing_payments_on() then
    -- Payments are switched off for everyone: nothing to buy and no trial to use up.
    raise exception 'AZ_PAYMENT_UNAVAILABLE' using errcode = '22023';
  end if;
  if p_client_operation_id is null then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_product from public.billing_products where code = p_product_code and active;
  if not found then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_discount_code, '')), '') is not null then
    v_code := public.billing_find_discount(p_discount_code);
    v_percent := v_code.percent_off;
  end if;
  -- Whole minor units, rounded down, so the shop never pays a fraction more than the discount says.
  v_amount := v_product.amount_minor * (100 - v_percent) / 100;

  insert into public.billing_payments (
    business_id, product_code, months, reference, list_amount_minor, discount_code_id, percent_off,
    amount_minor, currency_code, created_by
  ) values (
    p_business_id, v_product.code, v_product.months, v_reference, v_product.amount_minor, v_code.id, v_percent,
    v_amount, v_product.currency_code, auth.uid()
  ) returning id into v_id;

  v_result := jsonb_build_object(
    'reference', v_reference, 'amount_minor', v_amount, 'list_amount_minor', v_product.amount_minor,
    'percent_off', v_percent, 'currency_code', v_product.currency_code, 'months', v_product.months,
    'status', 'pending');
  if v_amount = 0 then
    v_result := v_result || public.billing_mark_paid(v_id, 'discount', now());
  end if;
  return public.sync_record(p_business_id, p_client_operation_id, 'billing_payment', v_result);
end $$;
revoke all on function public.rpc_billing_start_payment(uuid, uuid, text, text) from public, anon;
grant execute on function public.rpc_billing_start_payment(uuid, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- platform admin: the switch and the plans
-- ---------------------------------------------------------------------------
create or replace function public.rpc_admin_billing_settings()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_platform_admin();
  return jsonb_build_object(
    'payments_on', public.billing_payments_on(),
    'updated_at', (select updated_at from public.billing_settings),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', p.code, 'months', p.months, 'amount_minor', p.amount_minor,
        'currency_code', p.currency_code, 'active', p.active
      ) order by p.sort_order)
      from public.billing_products p
    ), '[]'::jsonb)
  );
end $$;
revoke all on function public.rpc_admin_billing_settings() from public, anon;
grant execute on function public.rpc_admin_billing_settings() to authenticated;

create or replace function public.rpc_admin_set_payments_on(p_on boolean)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_platform_admin();
  if p_on is null then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  update public.billing_settings set payments_on = p_on, updated_at = now(), updated_by = auth.uid() where id;
  perform public.audit(null, 'billing.payments_switched', 'billing_settings', null, jsonb_build_object('payments_on', p_on));
  return jsonb_build_object('payments_on', p_on);
end $$;
revoke all on function public.rpc_admin_set_payments_on(boolean) from public, anon;
grant execute on function public.rpc_admin_set_payments_on(boolean) to authenticated;

-- Change a plan's price, or stop or resume offering it. Time already paid for is not touched.
create or replace function public.rpc_admin_update_billing_product(p_code text, p_amount_minor bigint, p_active boolean)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_platform_admin();
  if p_code is null or p_active is null or p_amount_minor is null
     or p_amount_minor < 1 or p_amount_minor > 100000000 then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  update public.billing_products set amount_minor = p_amount_minor, active = p_active where code = p_code;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  perform public.audit(null, 'billing.product_changed', 'billing_product', null,
    jsonb_build_object('code', p_code, 'amount_minor', p_amount_minor, 'active', p_active));
  return jsonb_build_object('code', p_code, 'amount_minor', p_amount_minor, 'active', p_active);
end $$;
revoke all on function public.rpc_admin_update_billing_product(text, bigint, boolean) from public, anon;
grant execute on function public.rpc_admin_update_billing_product(text, bigint, boolean) to authenticated;
