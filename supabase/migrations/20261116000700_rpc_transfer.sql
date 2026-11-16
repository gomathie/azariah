-- Moving money between two accounts of the same business (scenario F).
-- Two movements, opposite signs. Not a sale and not an expense.

create or replace function public.rpc_transfer_between_accounts(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_occurred_at timestamptz,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount_minor bigint,
  p_note text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_business public.businesses%rowtype;
  v_from_business uuid;
  v_to_business uuid;
  v_from_active boolean;
  v_to_active boolean;
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

  if p_client_operation_id is null or p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'AZ_INVALID_AMOUNT' using errcode = '22023';
  end if;
  if p_from_account_id is null or p_to_account_id is null then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  if p_from_account_id = p_to_account_id then
    raise exception 'AZ_SAME_ACCOUNT' using errcode = '22023';
  end if;

  select * into v_business from public.businesses where id = p_business_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  select business_id, is_active into v_from_business, v_from_active
  from public.money_accounts where id = p_from_account_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if v_from_business <> p_business_id then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;

  select business_id, is_active into v_to_business, v_to_active
  from public.money_accounts where id = p_to_account_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if v_to_business <> p_business_id then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;
  if not v_from_active or not v_to_active then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  v_occurred := coalesce(p_occurred_at, now());
  v_date := public.business_local_date(p_business_id, v_occurred);

  insert into public.transactions (
    business_id, kind, occurred_at, business_date, amount_minor, currency_code,
    note, client_operation_id, created_by
  ) values (
    p_business_id, 'transfer', v_occurred, v_date, p_amount_minor, v_business.currency_code,
    nullif(btrim(p_note), ''), p_client_operation_id, auth.uid()
  ) returning id into v_tx;

  insert into public.money_movements (business_id, transaction_id, money_account_id, amount_minor, occurred_at, business_date)
  values
    (p_business_id, v_tx, p_from_account_id, -p_amount_minor, v_occurred, v_date),
    (p_business_id, v_tx, p_to_account_id, p_amount_minor, v_occurred, v_date);

  perform public.audit(p_business_id, 'transfer.created', 'transaction', v_tx,
    jsonb_build_object('amount_minor', p_amount_minor, 'from', p_from_account_id, 'to', p_to_account_id));

  v_result := jsonb_build_object(
    'transaction_id', v_tx,
    'business_date', v_date,
    'amount_minor', p_amount_minor
  );
  return public.sync_record(p_business_id, p_client_operation_id, 'transfer', v_result);
exception
  when unique_violation then
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end $$;

revoke all on function public.rpc_transfer_between_accounts(uuid, uuid, timestamptz, uuid, uuid, bigint, text) from public, anon;
grant execute on function public.rpc_transfer_between_accounts(uuid, uuid, timestamptz, uuid, uuid, bigint, text) to authenticated;
