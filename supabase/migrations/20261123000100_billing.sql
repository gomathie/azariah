-- Azaria Plus billing and discount codes (ADR-010).
--
-- Rules this migration enforces:
--   1. A shop buys prepaid time. Plus is on while plus_until (plus 7 days of grace) is in the future.
--      Nothing stores "is paid" as a flag: it is always worked out from the date.
--   2. The browser can ask for a payment but can never mark one paid. Only billing_apply_payment,
--      which the service role alone may call (from the Paystack webhook and verify functions), does that.
--   3. The price is read here, from billing_products, never from the request.
--   4. A payment counts once, however many times Paystack reports it.
--   5. A discount code is made by a platform admin. It takes a percentage off, for a period or
--      for ever. A 100% code turns Plus on with no payment at all.
--   6. Bookkeeping is never blocked for a shop that has not paid.

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------
create table public.billing_products (
  code text primary key check (code ~ '^[a-z0-9_]{3,32}$'),
  months integer not null check (months between 1 and 36),
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null default 'GHS' check (currency_code ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  sort_order integer not null default 0
);
alter table public.billing_products enable row level security;
revoke all on public.billing_products from anon, authenticated;
grant select on public.billing_products to authenticated;
create policy billing_products_select on public.billing_products for select to authenticated using (true);

-- PLACEHOLDER PRICES. The owner has not set prices yet (plan decision D1). Change them with an
-- UPDATE before taking real money; see docs/DEPLOYMENT.md, "Azaria Plus payments".
insert into public.billing_products (code, months, amount_minor, sort_order) values
  ('plus_1m', 1, 3000, 1),
  ('plus_3m', 3, 8000, 2),
  ('plus_12m', 12, 30000, 3);

create table public.business_entitlements (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  plus_until timestamptz,
  trial_used boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.business_entitlements enable row level security;
revoke all on public.business_entitlements from anon, authenticated;
grant select on public.business_entitlements to authenticated;
create policy business_entitlements_select on public.business_entitlements
  for select to authenticated using (public.is_member(business_id));

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  -- Stored in capitals. Letters and digits only, so a code can be read out over the phone.
  code text not null unique check (code ~ '^[A-Z0-9]{6,24}$'),
  percent_off integer not null check (percent_off between 1 and 100),
  -- null means the code never runs out.
  valid_until timestamptz,
  -- null means any number of payments may use it.
  max_uses integer check (max_uses is null or max_uses > 0),
  note text check (note is null or length(note) <= 200),
  active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
alter table public.discount_codes enable row level security;
-- No grants and no policies: codes are reached only through the functions below, so nobody can list them.
revoke all on public.discount_codes from anon, authenticated;

create or replace function public.clean_discount_codes() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.note := public.clean_text(new.note);
  return new;
end $$;
create trigger discount_codes_clean_text before insert or update of note on public.discount_codes
  for each row execute function public.clean_discount_codes();

create table public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_code text not null references public.billing_products (code),
  months integer not null check (months between 1 and 36),
  reference text not null unique check (reference ~ '^azp-[0-9a-f]{32}$'),
  list_amount_minor bigint not null check (list_amount_minor > 0),
  discount_code_id uuid references public.discount_codes (id),
  percent_off integer not null default 0 check (percent_off between 0 and 100),
  -- What the shop actually pays. Zero only for a 100% discount code.
  amount_minor bigint not null check (amount_minor >= 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  channel text check (channel is null or length(channel) <= 40),
  paid_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index billing_payments_business_idx on public.billing_payments (business_id, created_at desc);
create index billing_payments_discount_idx on public.billing_payments (discount_code_id) where status = 'paid';
alter table public.billing_payments enable row level security;
revoke all on public.billing_payments from anon, authenticated;
grant select on public.billing_payments to authenticated;
-- Roles are named, so a support person with a live grant cannot read a shop's payments.
create policy billing_payments_select on public.billing_payments
  for select to authenticated using (public.is_member(business_id, '{owner,manager}'));

-- What Paystack sent us, kept for audit and replay. It holds the payer's email and masked card or
-- phone details, so no API role can read it.
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique check (length(event_key) <= 200),
  event_type text not null check (length(event_type) <= 80),
  reference text check (reference is null or length(reference) <= 100),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- entitlement
-- ---------------------------------------------------------------------------
create or replace function public.billing_grace() returns interval
language sql immutable set search_path = public, pg_temp as $$ select interval '7 days' $$;

-- True while the shop's paid time, plus grace, has not run out. False for someone outside the shop.
create or replace function public.has_plus(p_business_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.is_member(p_business_id) and exists (
    select 1 from public.business_entitlements e
    where e.business_id = p_business_id and e.plus_until + public.billing_grace() > now()
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
begin
  perform public.assert_member(p_business_id);
  select plus_until, trial_used into v_until, v_trial_used
  from public.business_entitlements where business_id = p_business_id;

  return jsonb_build_object(
    'plus_until', v_until,
    'has_plus', coalesce(v_until + public.billing_grace() > now(), false),
    'in_grace', coalesce(v_until <= now() and v_until + public.billing_grace() > now(), false),
    'trial_available', not coalesce(v_trial_used, false) and v_until is null,
    'can_pay', v_is_owner,
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

-- Fourteen days of Plus, once per shop, so a person can hear and try it before paying.
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

-- ---------------------------------------------------------------------------
-- discount codes
-- ---------------------------------------------------------------------------
-- Finds a code that can be used right now, or raises AZ_DISCOUNT_INVALID. One answer for every
-- reason (wrong, switched off, run out, used up), so a guesser learns nothing from the difference.
create or replace function public.billing_find_discount(p_code text)
returns public.discount_codes
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_row public.discount_codes;
begin
  if v_code !~ '^[A-Z0-9]{6,24}$' then
    raise exception 'AZ_DISCOUNT_INVALID' using errcode = '22023';
  end if;
  select * into v_row from public.discount_codes d where d.code = v_code;
  if not found or not v_row.active
     or (v_row.valid_until is not null and v_row.valid_until <= now())
     or (v_row.max_uses is not null and v_row.max_uses <= (
          select count(*) from public.billing_payments bp
          where bp.discount_code_id = v_row.id and bp.status = 'paid')) then
    raise exception 'AZ_DISCOUNT_INVALID' using errcode = '22023';
  end if;
  return v_row;
end $$;
revoke all on function public.billing_find_discount(text) from public, anon, authenticated;

-- Marks one payment paid and adds its months to the shop. Internal: no API role may call it.
-- Paying early adds to the existing date; it never shortens it.
create or replace function public.billing_mark_paid(p_payment_id uuid, p_channel text, p_paid_at timestamptz)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.billing_payments;
  v_until timestamptz;
begin
  select * into v_payment from public.billing_payments where id = p_payment_id for update;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if v_payment.status = 'paid' then
    select plus_until into v_until from public.business_entitlements where business_id = v_payment.business_id;
    return jsonb_build_object('status', 'paid', 'already_paid', true, 'plus_until', v_until);
  end if;

  update public.billing_payments
  set status = 'paid', channel = left(p_channel, 40), paid_at = coalesce(p_paid_at, now())
  where id = p_payment_id;

  insert into public.business_entitlements as e (business_id, plus_until, trial_used)
  values (v_payment.business_id, now() + make_interval(months => v_payment.months), true)
  on conflict (business_id) do update
    set plus_until = greatest(coalesce(e.plus_until, now()), now()) + make_interval(months => v_payment.months),
        trial_used = true,
        updated_at = now()
  returning plus_until into v_until;

  perform public.audit(v_payment.business_id, 'billing.paid', 'billing_payment', v_payment.id,
    jsonb_build_object('months', v_payment.months, 'amount_minor', v_payment.amount_minor,
      'percent_off', v_payment.percent_off, 'plus_until', v_until));
  return jsonb_build_object('status', 'paid', 'already_paid', false, 'plus_until', v_until);
end $$;
revoke all on function public.billing_mark_paid(uuid, text, timestamptz) from public, anon, authenticated;

-- What a code would do to a price, so the upgrade screen can show it before the owner pays.
create or replace function public.rpc_check_discount_code(p_business_id uuid, p_code text)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_code public.discount_codes;
begin
  perform public.assert_member(p_business_id, '{owner}');
  v_code := public.billing_find_discount(p_code);
  return jsonb_build_object('code', v_code.code, 'percent_off', v_code.percent_off, 'valid_until', v_code.valid_until);
end $$;
revoke all on function public.rpc_check_discount_code(uuid, text) from public, anon;
grant execute on function public.rpc_check_discount_code(uuid, text) to authenticated;

-- Opens a payment. The price and the discount are worked out here. The row is 'pending' and gives
-- nothing until Paystack confirms it, except when a 100% code brings the amount to zero: then there
-- is nothing to pay and Plus is turned on at once.
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
-- service role only: called by the Edge Functions after Paystack confirms a payment
-- ---------------------------------------------------------------------------
create or replace function public.billing_apply_payment(
  p_reference text, p_amount_minor bigint, p_currency_code text, p_channel text default null,
  p_paid_at timestamptz default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.billing_payments;
begin
  select * into v_payment from public.billing_payments where reference = p_reference;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  -- Paystack must report the amount and currency we asked for. Anything else is refused.
  if p_amount_minor is distinct from v_payment.amount_minor
     or upper(coalesce(p_currency_code, '')) <> v_payment.currency_code then
    raise exception 'AZ_INVALID_AMOUNT' using errcode = '22023';
  end if;
  return public.billing_mark_paid(v_payment.id, p_channel, p_paid_at)
    || jsonb_build_object('business_id', v_payment.business_id);
end $$;
revoke all on function public.billing_apply_payment(text, bigint, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.billing_apply_payment(text, bigint, text, text, timestamptz) to service_role;

-- Stores a webhook event once. Returns false when the same event was stored before.
create or replace function public.billing_record_event(
  p_event_key text, p_event_type text, p_reference text, p_payload jsonb
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.billing_events (event_key, event_type, reference, payload)
  values (left(p_event_key, 200), left(p_event_type, 80), left(p_reference, 100), p_payload)
  on conflict (event_key) do nothing;
  return found;
end $$;
revoke all on function public.billing_record_event(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.billing_record_event(text, text, text, jsonb) to service_role;

create or replace function public.billing_event_processed(p_event_key text)
returns void
language sql security definer
set search_path = public, pg_temp
as $$
  update public.billing_events set processed_at = now() where event_key = p_event_key;
$$;
revoke all on function public.billing_event_processed(text) from public, anon, authenticated;
grant execute on function public.billing_event_processed(text) to service_role;

-- ---------------------------------------------------------------------------
-- platform admin: discount codes
-- ---------------------------------------------------------------------------
-- p_valid_days null means the code never runs out. p_max_uses null means no limit on payments.
create or replace function public.rpc_admin_create_discount_code(
  p_code text, p_percent_off integer, p_valid_days integer default null,
  p_max_uses integer default null, p_note text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_until timestamptz;
  v_id uuid;
begin
  perform public.assert_platform_admin();
  if v_code !~ '^[A-Z0-9]{6,24}$'
     or p_percent_off is null or p_percent_off < 1 or p_percent_off > 100
     or (p_valid_days is not null and (p_valid_days < 1 or p_valid_days > 3650))
     or (p_max_uses is not null and (p_max_uses < 1 or p_max_uses > 1000000))
     or (p_note is not null and length(p_note) > 200) then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  if exists (select 1 from public.discount_codes where code = v_code) then
    raise exception 'AZ_DISCOUNT_EXISTS' using errcode = '23505';
  end if;
  if p_valid_days is not null then
    v_until := now() + make_interval(days => p_valid_days);
  end if;

  insert into public.discount_codes (code, percent_off, valid_until, max_uses, note, created_by)
  values (v_code, p_percent_off, v_until, p_max_uses, nullif(btrim(p_note), ''), auth.uid())
  returning id into v_id;
  perform public.audit(null, 'billing.discount_created', 'discount_code', v_id,
    jsonb_build_object('code', v_code, 'percent_off', p_percent_off, 'valid_until', v_until, 'max_uses', p_max_uses));
  return jsonb_build_object('id', v_id, 'code', v_code, 'percent_off', p_percent_off, 'valid_until', v_until);
end $$;
revoke all on function public.rpc_admin_create_discount_code(text, integer, integer, integer, text) from public, anon;
grant execute on function public.rpc_admin_create_discount_code(text, integer, integer, integer, text) to authenticated;

create or replace function public.rpc_admin_list_discount_codes()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_platform_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select d.id, d.code, d.percent_off, d.valid_until, d.max_uses, d.note, d.active, d.created_at,
        (select count(*) from public.billing_payments bp
          where bp.discount_code_id = d.id and bp.status = 'paid') as uses
      from public.discount_codes d
      order by d.created_at desc limit 200
    ) x
  ), '[]'::jsonb);
end $$;
revoke all on function public.rpc_admin_list_discount_codes() from public, anon;
grant execute on function public.rpc_admin_list_discount_codes() to authenticated;

-- Switch a code off (or back on). Time a shop already paid for with the code is not taken away.
create or replace function public.rpc_admin_set_discount_code_active(p_id uuid, p_active boolean)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_platform_admin();
  if p_active is null then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  update public.discount_codes set active = p_active where id = p_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  perform public.audit(null, 'billing.discount_changed', 'discount_code', p_id, jsonb_build_object('active', p_active));
  return jsonb_build_object('id', p_id, 'active', p_active);
end $$;
revoke all on function public.rpc_admin_set_discount_code_active(uuid, boolean) from public, anon;
grant execute on function public.rpc_admin_set_discount_code_active(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- the shop directory gains one column: until when the shop has Plus. Still no money figures.
-- ---------------------------------------------------------------------------
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
        where g.business_id = b.id and g.revoked_at is null and g.expires_at > now()) as support_expires_at,
      (select e.plus_until from public.business_entitlements e where e.business_id = b.id) as plus_until
    from public.businesses b
    left join auth.users u on u.id = b.created_by
    where (p_before is null or b.created_at < p_before)
      and (v_like is null or b.name ilike v_like escape '\' or u.email ilike v_like escape '\')
    order by b.created_at desc
    limit v_limit
  ) x;
  return v_rows;
end $$;
