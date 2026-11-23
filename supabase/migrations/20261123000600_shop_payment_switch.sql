-- Payments can be turned on or off for one shop, apart from the switch for everyone.
--
-- A shop with no entry here follows the general switch (billing_settings.payments_on).
-- An entry says: this shop must pay even while payments are off for everyone (payments_on = true),
-- or this shop is free even while everyone else pays (payments_on = false).
-- Only an admin with the billing right can set it; every change is audited.

create table public.business_payment_switches (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  payments_on boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.business_payment_switches enable row level security;
-- No grants and no policies: the API cannot read or change this table. rpc_billing_status reports the result.
revoke all on public.business_payment_switches from anon, authenticated;

-- Whether this shop is asked to pay: its own entry if it has one, otherwise the general switch.
create or replace function public.billing_payments_on(p_business_id uuid) returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select s.payments_on from public.business_payment_switches s where s.business_id = p_business_id),
    public.billing_payments_on()
  );
$$;
revoke all on function public.billing_payments_on(uuid) from public, anon, authenticated;

-- The four functions that decide for a shop now ask about that shop. Only that call changes.
do $$
declare
  v_fn text;
  v_def text;
  v_old constant text := 'public.billing_payments_on()';
begin
  foreach v_fn in array array['has_plus', 'rpc_billing_status', 'rpc_start_trial', 'rpc_billing_start_payment']
  loop
    select pg_get_functiondef(p.oid) into strict v_def
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = v_fn;
    if position(v_old in v_def) = 0 then
      raise exception 'shop payment switch: % does not read the general switch', v_fn;
    end if;
    execute replace(v_def, v_old, 'public.billing_payments_on(p_business_id)');
  end loop;
end $$;

-- The directory row says how the shop is set: 'on', 'off', or 'default' (follows the general switch).
do $$
declare
  v_def text;
  v_old constant text := 'u.email as owner_email,';
begin
  select pg_get_functiondef(p.oid) into strict v_def
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'rpc_admin_list_businesses';
  if position(v_old in v_def) = 0 then
    raise exception 'shop payment switch: the directory has no owner_email column to extend';
  end if;
  execute replace(v_def, v_old, v_old || '
      coalesce((select case when s.payments_on then ''on'' else ''off'' end
                from public.business_payment_switches s where s.business_id = b.id), ''default'') as payments_mode,');
end $$;

create or replace function public.rpc_admin_set_business_payments(p_business_id uuid, p_mode text)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_platform_admin('billing');
  if p_mode is null or p_mode not in ('on', 'off', 'default') then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  if not exists (select 1 from public.businesses where id = p_business_id) then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if p_mode = 'default' then
    delete from public.business_payment_switches where business_id = p_business_id;
  else
    insert into public.business_payment_switches (business_id, payments_on, updated_by)
    values (p_business_id, p_mode = 'on', auth.uid())
    on conflict (business_id) do update
      set payments_on = excluded.payments_on, updated_at = now(), updated_by = excluded.updated_by;
  end if;
  perform public.audit(p_business_id, 'billing.shop_payments_set', 'business', p_business_id,
    jsonb_build_object('mode', p_mode));
  return jsonb_build_object('id', p_business_id, 'payments_mode', p_mode);
end $$;
revoke all on function public.rpc_admin_set_business_payments(uuid, text) from public, anon;
grant execute on function public.rpc_admin_set_business_payments(uuid, text) to authenticated;
