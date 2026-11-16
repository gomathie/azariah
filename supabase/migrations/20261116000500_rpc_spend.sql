-- Cash leaving or entering an account without creating a sale (spec §4, scenarios D, E, G, H).
-- Outflows (expense, stock purchase, owner withdrawal) store a negative money_movements.amount_minor.
-- Inflows (owner contribution, opening balance) store a positive one.
-- The transaction row always stores a positive amount_minor; kind says what the event was.
-- Opening balances are money movements, not revenue (spec §4.5).

create or replace function public.post_money_event(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_occurred_at timestamptz,
  p_business_date date,
  p_amount_minor bigint,
  p_money_account_id uuid,
  p_category_id uuid,
  p_category_kind public.category_kind,
  p_kind public.transaction_kind,
  p_movement_sign integer,
  p_description text,
  p_note text,
  p_sync_kind text,
  p_audit_action text
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_business public.businesses%rowtype;
  v_account_business uuid;
  v_account_active boolean;
  v_category_business uuid;
  v_category_kind public.category_kind;
  v_category_active boolean;
  v_occurred timestamptz;
  v_date date;
  v_tx uuid;
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner,manager,staff}');

  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  if p_client_operation_id is null
     or p_amount_minor is null or p_amount_minor <= 0
     or p_movement_sign not in (-1, 1) then
    raise exception 'AZ_INVALID_AMOUNT' using errcode = '22023';
  end if;

  if p_money_account_id is null then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  select * into v_business from public.businesses where id = p_business_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  select business_id, is_active into v_account_business, v_account_active
  from public.money_accounts where id = p_money_account_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  -- A real account that belongs to someone else is a cross-tenant attempt, not a typo.
  if v_account_business <> p_business_id then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;
  if not v_account_active then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  if p_category_kind is null then
    if p_category_id is not null then
      raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
    end if;
  else
    if p_category_id is null then
      raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
    end if;
    select business_id, kind, is_active into v_category_business, v_category_kind, v_category_active
    from public.categories where id = p_category_id;
    if not found or not v_category_active or v_category_kind <> p_category_kind then
      raise exception 'AZ_NOT_FOUND' using errcode = '22023';
    end if;
    if v_category_business <> p_business_id then
      raise exception 'AZ_FORBIDDEN' using errcode = '42501';
    end if;
  end if;

  -- Opening balance passes the calendar date the owner chose. Everything else derives the
  -- business date from the instant, so a late-night entry stays on that business's day.
  if p_business_date is not null then
    v_date := p_business_date;
    v_occurred := coalesce(p_occurred_at, (p_business_date::timestamp at time zone v_business.timezone));
  else
    v_occurred := coalesce(p_occurred_at, now());
    v_date := public.business_local_date(p_business_id, v_occurred);
  end if;

  insert into public.transactions (
    business_id, kind, occurred_at, business_date, amount_minor, currency_code,
    category_id, description, note, client_operation_id, created_by
  ) values (
    p_business_id, p_kind, v_occurred, v_date, p_amount_minor, v_business.currency_code,
    p_category_id, nullif(btrim(p_description), ''), nullif(btrim(p_note), ''),
    p_client_operation_id, auth.uid()
  ) returning id into v_tx;

  insert into public.money_movements (
    business_id, transaction_id, money_account_id, amount_minor, occurred_at, business_date
  ) values (
    p_business_id, v_tx, p_money_account_id, p_amount_minor * p_movement_sign, v_occurred, v_date
  );

  perform public.audit(p_business_id, p_audit_action, 'transaction', v_tx,
    jsonb_build_object('amount_minor', p_amount_minor, 'money_account_id', p_money_account_id, 'kind', p_kind));

  v_result := jsonb_build_object(
    'transaction_id', v_tx,
    'business_date', v_date,
    'amount_minor', p_amount_minor,
    'money_account_id', p_money_account_id,
    'kind', p_kind
  );
  return public.sync_record(p_business_id, p_client_operation_id, p_sync_kind, v_result);
exception
  when unique_violation then
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end $$;

revoke all on function public.post_money_event(
  uuid, uuid, timestamptz, date, bigint, uuid, uuid, public.category_kind,
  public.transaction_kind, integer, text, text, text, text
) from public, anon, authenticated;

create or replace function public.rpc_record_expense(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_occurred_at timestamptz,
  p_amount_minor bigint,
  p_money_account_id uuid,
  p_category_id uuid,
  p_description text default null,
  p_note text default null
) returns jsonb
language sql security definer
set search_path = public, pg_temp
as $$
  select public.post_money_event(
    p_client_operation_id, p_business_id, p_occurred_at, null,
    p_amount_minor, p_money_account_id, p_category_id, 'operating_expense',
    'expense', -1, p_description, p_note, 'expense', 'expense.created'
  );
$$;

create or replace function public.rpc_record_stock_purchase(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_occurred_at timestamptz,
  p_amount_minor bigint,
  p_money_account_id uuid,
  p_category_id uuid,
  p_description text default null,
  p_note text default null
) returns jsonb
language sql security definer
set search_path = public, pg_temp
as $$
  select public.post_money_event(
    p_client_operation_id, p_business_id, p_occurred_at, null,
    p_amount_minor, p_money_account_id, p_category_id, 'stock_purchase',
    'stock_purchase', -1, p_description, p_note, 'stock_purchase', 'stock_purchase.created'
  );
$$;

create or replace function public.rpc_record_owner_movement(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_occurred_at timestamptz,
  p_amount_minor bigint,
  p_money_account_id uuid,
  p_direction text,
  p_note text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_kind public.transaction_kind;
  v_sign integer;
begin
  perform public.assert_member(p_business_id, '{owner,manager,staff}');

  if p_direction = 'contribution' then
    v_kind := 'owner_contribution';
    v_sign := 1;
  elsif p_direction = 'withdrawal' then
    v_kind := 'owner_withdrawal';
    v_sign := -1;
  else
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  return public.post_money_event(
    p_client_operation_id, p_business_id, p_occurred_at, null,
    p_amount_minor, p_money_account_id, null, null,
    v_kind, v_sign, null, p_note, p_direction, v_kind::text || '.created'
  );
end $$;

create or replace function public.rpc_record_opening_balance(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_money_account_id uuid,
  p_amount_minor bigint,
  p_as_of date
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_member(p_business_id, '{owner,manager,staff}');

  if p_as_of is null then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  return public.post_money_event(
    p_client_operation_id, p_business_id, null, p_as_of,
    p_amount_minor, p_money_account_id, null, null,
    'opening_balance', 1, null, null, 'opening_balance', 'opening_balance.created'
  );
end $$;

revoke all on function public.rpc_record_expense(uuid, uuid, timestamptz, bigint, uuid, uuid, text, text) from public, anon;
grant execute on function public.rpc_record_expense(uuid, uuid, timestamptz, bigint, uuid, uuid, text, text) to authenticated;

revoke all on function public.rpc_record_stock_purchase(uuid, uuid, timestamptz, bigint, uuid, uuid, text, text) from public, anon;
grant execute on function public.rpc_record_stock_purchase(uuid, uuid, timestamptz, bigint, uuid, uuid, text, text) to authenticated;

revoke all on function public.rpc_record_owner_movement(uuid, uuid, timestamptz, bigint, uuid, text, text) from public, anon;
grant execute on function public.rpc_record_owner_movement(uuid, uuid, timestamptz, bigint, uuid, text, text) to authenticated;

revoke all on function public.rpc_record_opening_balance(uuid, uuid, uuid, bigint, date) from public, anon;
grant execute on function public.rpc_record_opening_balance(uuid, uuid, uuid, bigint, date) to authenticated;
