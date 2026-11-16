-- Correct a posted entry by adding the opposite movements (scenario J).
-- The original row stays, marked reversed. Owner and manager only: staff record entries, they do not undo them.

create or replace function public.rpc_reverse_transaction(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_transaction_id uuid,
  p_reason text
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_tx public.transactions%rowtype;
  v_new uuid;
  v_rec record;
  v_remaining bigint;
  v_date date;
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner,manager}');

  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  if p_client_operation_id is null or p_transaction_id is null or length(btrim(coalesce(p_reason, ''))) < 1 then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id and business_id = p_business_id for update;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if v_tx.status = 'reversed' or v_tx.kind = 'reversal' then
    raise exception 'AZ_ALREADY_REVERSED' using errcode = '22023';
  end if;

  v_date := public.business_local_date(p_business_id, now());

  insert into public.transactions (
    business_id, kind, occurred_at, business_date, amount_minor, currency_code,
    description, note, reverses_transaction_id, client_operation_id, created_by
  ) values (
    p_business_id, 'reversal', now(), v_date, v_tx.amount_minor, v_tx.currency_code,
    v_tx.description, btrim(p_reason), v_tx.id, p_client_operation_id, auth.uid()
  ) returning id into v_new;

  insert into public.money_movements (business_id, transaction_id, money_account_id, amount_minor, occurred_at, business_date)
  select p_business_id, v_new, money_account_id, -amount_minor, now(), v_date
  from public.money_movements
  where transaction_id = v_tx.id;

  for v_rec in
    select * from public.receivables where transaction_id = v_tx.id and status <> 'reversed' for update
  loop
    select v_rec.amount_minor - coalesce(sum(amount_minor), 0) into v_remaining
    from public.credit_allocations where receivable_id = v_rec.id;
    if v_remaining <> 0 then
      -- Negative on purpose: this row undoes the remaining debt. The balance view drops the
      -- receivable because its status becomes reversed.
      insert into public.credit_allocations (business_id, receivable_id, transaction_id, amount_minor)
      values (p_business_id, v_rec.id, v_new, -v_remaining);
    end if;
    update public.receivables set status = 'reversed' where id = v_rec.id;
  end loop;

  update public.transactions
  set status = 'reversed', reversed_by_transaction_id = v_new
  where id = v_tx.id;

  perform public.audit(p_business_id, 'transaction.reversed', 'transaction', v_tx.id,
    jsonb_build_object('reversal_id', v_new, 'reason', btrim(p_reason)));

  v_result := jsonb_build_object(
    'transaction_id', v_new,
    'reverses_transaction_id', v_tx.id,
    'business_date', v_date
  );
  return public.sync_record(p_business_id, p_client_operation_id, 'reversal', v_result);
exception
  when unique_violation then
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end $$;

revoke all on function public.rpc_reverse_transaction(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.rpc_reverse_transaction(uuid, uuid, uuid, text) to authenticated;
