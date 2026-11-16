-- rpc_create_sale: records a sale that is paid, partly paid or fully on credit (spec §4.1, §4.2).
--   sale amount   -> transactions (kind = 'sale')
--   money received -> one money_movements row into the receiving account
--   balance due   -> one receivables row for the customer
-- Idempotent on p_client_operation_id; atomic; business_date computed in the business timezone.

create or replace function public.business_local_date(p_business_id uuid, p_occurred_at timestamptz)
returns date
language sql stable
set search_path = public, pg_temp
as $$
  select (p_occurred_at at time zone b.timezone)::date from public.businesses b where b.id = p_business_id;
$$;
revoke all on function public.business_local_date(uuid, timestamptz) from public, anon;
grant execute on function public.business_local_date(uuid, timestamptz) to authenticated;

create or replace function public.rpc_create_sale(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_occurred_at timestamptz,
  p_amount_minor bigint,
  p_received_minor bigint,
  p_money_account_id uuid default null,
  p_contact_id uuid default null,
  p_category_id uuid default null,
  p_description text default null,
  p_note text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_business public.businesses%rowtype;
  v_occurred timestamptz := coalesce(p_occurred_at, now());
  v_date date;
  v_credit bigint;
  v_tx uuid;
  v_receivable uuid;
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner,manager,staff}');

  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_business from public.businesses where id = p_business_id;

  if p_client_operation_id is null
     or p_amount_minor is null or p_amount_minor <= 0
     or p_received_minor is null or p_received_minor < 0
     or p_received_minor > p_amount_minor then
    raise exception 'AZ_INVALID_AMOUNT' using errcode = '22023';
  end if;

  v_credit := p_amount_minor - p_received_minor;

  if v_credit > 0 and p_contact_id is null then
    raise exception 'AZ_CONTACT_REQUIRED' using errcode = '22023';
  end if;

  if p_received_minor > 0 then
    if p_money_account_id is null or not exists (
      select 1 from public.money_accounts
      where id = p_money_account_id and business_id = p_business_id and is_active
    ) then
      raise exception 'AZ_NOT_FOUND' using errcode = '22023';
    end if;
  end if;

  if p_contact_id is not null and not exists (
    select 1 from public.contacts where id = p_contact_id and business_id = p_business_id
  ) then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories
    where id = p_category_id and business_id = p_business_id and kind = 'sale'
  ) then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  v_date := public.business_local_date(p_business_id, v_occurred);

  insert into public.transactions (
    business_id, kind, occurred_at, business_date, amount_minor, currency_code,
    category_id, contact_id, description, note, client_operation_id, created_by
  ) values (
    p_business_id, 'sale', v_occurred, v_date, p_amount_minor, v_business.currency_code,
    p_category_id, p_contact_id, nullif(btrim(p_description), ''), nullif(btrim(p_note), ''),
    p_client_operation_id, auth.uid()
  ) returning id into v_tx;

  if p_received_minor > 0 then
    insert into public.money_movements (business_id, transaction_id, money_account_id, amount_minor, occurred_at, business_date)
    values (p_business_id, v_tx, p_money_account_id, p_received_minor, v_occurred, v_date);
  end if;

  if v_credit > 0 then
    insert into public.receivables (business_id, transaction_id, contact_id, amount_minor)
    values (p_business_id, v_tx, p_contact_id, v_credit)
    returning id into v_receivable;
  end if;

  perform public.audit(p_business_id, 'sale.created', 'transaction', v_tx,
    jsonb_build_object('amount_minor', p_amount_minor, 'received_minor', p_received_minor, 'credit_minor', v_credit));

  v_result := jsonb_build_object(
    'transaction_id', v_tx,
    'receivable_id', v_receivable,
    'business_date', v_date,
    'amount_minor', p_amount_minor,
    'received_minor', p_received_minor,
    'credit_minor', v_credit
  );
  return public.sync_record(p_business_id, p_client_operation_id, 'sale', v_result);
exception
  when unique_violation then
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end $$;

revoke all on function public.rpc_create_sale(uuid, uuid, timestamptz, bigint, bigint, uuid, uuid, uuid, text, text) from public, anon;
grant execute on function public.rpc_create_sale(uuid, uuid, timestamptz, bigint, bigint, uuid, uuid, uuid, text, text) to authenticated;
