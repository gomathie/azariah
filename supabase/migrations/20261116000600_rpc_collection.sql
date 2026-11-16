-- A later payment on what a customer already owes (spec §4.2, scenario C).
-- Allocates oldest open receivable first. Does not create a sale.
-- The payment increases the money account and reduces outstanding debt.

create or replace function public.rpc_record_collection(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_occurred_at timestamptz,
  p_contact_id uuid,
  p_amount_minor bigint,
  p_money_account_id uuid,
  p_note text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_business public.businesses%rowtype;
  v_account_business uuid;
  v_account_active boolean;
  v_contact_business uuid;
  v_outstanding bigint;
  v_occurred timestamptz;
  v_date date;
  v_tx uuid;
  v_left bigint;
  v_rec record;
  v_remaining bigint;
  v_apply bigint;
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
  if p_contact_id is null or p_money_account_id is null then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  select * into v_business from public.businesses where id = p_business_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  select business_id into v_contact_business from public.contacts where id = p_contact_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if v_contact_business <> p_business_id then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;

  select business_id, is_active into v_account_business, v_account_active
  from public.money_accounts where id = p_money_account_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if v_account_business <> p_business_id then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;
  if not v_account_active then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  -- Lock this customer's open debts before reading the total, so two payments cannot both pass.
  perform r.id
  from public.receivables r
  where r.business_id = p_business_id and r.contact_id = p_contact_id and r.status = 'open'
  order by r.created_at, r.id
  for update;

  select coalesce(sum(r.amount_minor - coalesce(a.allocated_minor, 0)), 0)
    into v_outstanding
  from public.receivables r
  left join (
    select receivable_id, sum(amount_minor) as allocated_minor
    from public.credit_allocations
    group by receivable_id
  ) a on a.receivable_id = r.id
  where r.business_id = p_business_id and r.contact_id = p_contact_id and r.status = 'open';

  if p_amount_minor > v_outstanding then
    raise exception 'AZ_EXCEEDS_DEBT' using errcode = '22023';
  end if;

  v_occurred := coalesce(p_occurred_at, now());
  v_date := public.business_local_date(p_business_id, v_occurred);

  insert into public.transactions (
    business_id, kind, occurred_at, business_date, amount_minor, currency_code,
    contact_id, note, client_operation_id, created_by
  ) values (
    p_business_id, 'collection', v_occurred, v_date, p_amount_minor, v_business.currency_code,
    p_contact_id, nullif(btrim(p_note), ''), p_client_operation_id, auth.uid()
  ) returning id into v_tx;

  insert into public.money_movements (
    business_id, transaction_id, money_account_id, amount_minor, occurred_at, business_date
  ) values (
    p_business_id, v_tx, p_money_account_id, p_amount_minor, v_occurred, v_date
  );

  v_left := p_amount_minor;
  for v_rec in
    select r.id
    from public.receivables r
    where r.business_id = p_business_id and r.contact_id = p_contact_id and r.status = 'open'
    order by r.created_at, r.id
  loop
    exit when v_left = 0;
    select r.amount_minor - coalesce(sum(ca.amount_minor), 0)
      into v_remaining
    from public.receivables r
    left join public.credit_allocations ca on ca.receivable_id = r.id
    where r.id = v_rec.id
    group by r.amount_minor;

    if v_remaining <= 0 then
      continue;
    end if;

    v_apply := least(v_left, v_remaining);
    insert into public.credit_allocations (business_id, receivable_id, transaction_id, amount_minor)
    values (p_business_id, v_rec.id, v_tx, v_apply);

    if v_apply = v_remaining then
      update public.receivables set status = 'settled' where id = v_rec.id;
    end if;
    v_left := v_left - v_apply;
  end loop;

  if v_left <> 0 then
    raise exception 'AZ_EXCEEDS_DEBT' using errcode = '22023';
  end if;

  perform public.audit(p_business_id, 'collection.created', 'transaction', v_tx,
    jsonb_build_object('amount_minor', p_amount_minor, 'contact_id', p_contact_id));

  v_result := jsonb_build_object(
    'transaction_id', v_tx,
    'business_date', v_date,
    'amount_minor', p_amount_minor,
    'contact_id', p_contact_id,
    'outstanding_minor', v_outstanding - p_amount_minor
  );
  return public.sync_record(p_business_id, p_client_operation_id, 'collection', v_result);
exception
  when unique_violation then
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end $$;

revoke all on function public.rpc_record_collection(uuid, uuid, timestamptz, uuid, bigint, uuid, text) from public, anon;
grant execute on function public.rpc_record_collection(uuid, uuid, timestamptz, uuid, bigint, uuid, text) to authenticated;

-- Customer statement. Debit means the amount added to what they owe. Credit means a payment.
-- Running balance includes history before p_from, so a filtered range still shows the right "still owes".
create or replace function public.rpc_get_customer_statement(
  p_business_id uuid,
  p_contact_id uuid,
  p_from date default null,
  p_to date default null
) returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_contact_business uuid;
  v_rows jsonb;
begin
  perform public.assert_member(p_business_id);

  select business_id into v_contact_business from public.contacts where id = p_contact_id;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if v_contact_business <> p_business_id then
    raise exception 'AZ_FORBIDDEN' using errcode = '42501';
  end if;

  with lines as (
    select t.business_date as line_date, 'sale'::text as kind,
           coalesce(t.description, '') as description,
           r.amount_minor as debit_minor, 0::bigint as credit_minor,
           t.created_at, t.id
    from public.receivables r
    join public.transactions t on t.id = r.transaction_id
    where r.business_id = p_business_id and r.contact_id = p_contact_id and r.status <> 'reversed'
    union all
    select t.business_date, 'collection',
           coalesce(t.note, t.description, ''),
           0::bigint, t.amount_minor,
           t.created_at, t.id
    from public.transactions t
    where t.business_id = p_business_id and t.contact_id = p_contact_id
      and t.kind = 'collection' and t.status = 'posted'
  ),
  ordered as (
    select line_date, kind, description, debit_minor, credit_minor, created_at, id,
           sum(debit_minor - credit_minor) over (order by line_date, created_at, id) as balance_minor
    from lines
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', line_date,
    'kind', kind,
    'description', description,
    'debit_minor', debit_minor,
    'credit_minor', credit_minor,
    'balance_minor', balance_minor
  ) order by line_date, created_at, id), '[]'::jsonb)
  into v_rows
  from ordered
  where (p_from is null or line_date >= p_from)
    and (p_to is null or line_date <= p_to);

  return v_rows;
end $$;

revoke all on function public.rpc_get_customer_statement(uuid, uuid, date, date) from public, anon;
grant execute on function public.rpc_get_customer_statement(uuid, uuid, date, date) to authenticated;
