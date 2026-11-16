-- Reports read posted rows for a business-date range. Transfers are listed and left out of the cash-movement net.

create or replace function public.rpc_report_sales(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('total_minor', coalesce(sum(amount_minor), 0))
  from public.transactions
  where business_id = p_business_id and kind = 'sale' and status = 'posted'
    and business_date between p_from and p_to
    and public.is_member(p_business_id);
$$;

create or replace function public.rpc_report_money_received(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('total_minor', coalesce(sum(mm.amount_minor), 0))
  from public.money_movements mm
  join public.transactions t on t.id = mm.transaction_id
  where mm.business_id = p_business_id and t.status = 'posted' and t.kind in ('sale', 'collection')
    and mm.business_date between p_from and p_to
    and public.is_member(p_business_id);
$$;

create or replace function public.rpc_report_expenses(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('total_minor', coalesce(sum(amount_minor), 0))
  from public.transactions
  where business_id = p_business_id and kind = 'expense' and status = 'posted'
    and business_date between p_from and p_to
    and public.is_member(p_business_id);
$$;

create or replace function public.rpc_report_stock_purchases(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('total_minor', coalesce(sum(amount_minor), 0))
  from public.transactions
  where business_id = p_business_id and kind = 'stock_purchase' and status = 'posted'
    and business_date between p_from and p_to
    and public.is_member(p_business_id);
$$;

create or replace function public.rpc_report_account_statement(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_account uuid := nullif(p_filters ->> 'money_account_id', '')::uuid;
  v_opening bigint;
  v_lines jsonb;
begin
  perform public.assert_member(p_business_id);
  if v_account is null then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;
  select coalesce(sum(amount_minor), 0) into v_opening
  from public.money_movements
  where business_id = p_business_id and money_account_id = v_account and business_date < p_from;
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', business_date, 'amount_minor', amount_minor, 'transaction_id', transaction_id
  ) order by business_date, created_at), '[]'::jsonb) into v_lines
  from public.money_movements
  where business_id = p_business_id and money_account_id = v_account and business_date between p_from and p_to;
  return jsonb_build_object('opening_minor', v_opening, 'lines', v_lines,
    'closing_minor', v_opening + coalesce((select sum(amount_minor) from public.money_movements
      where business_id = p_business_id and money_account_id = v_account and business_date between p_from and p_to), 0));
end $$;

create or replace function public.rpc_report_cash_movement(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_net bigint;
  v_lines jsonb;
begin
  perform public.assert_member(p_business_id);
  select coalesce(sum(mm.amount_minor), 0) into v_net
  from public.money_movements mm
  join public.transactions t on t.id = mm.transaction_id
  where mm.business_id = p_business_id and t.kind <> 'transfer' and t.status = 'posted'
    and mm.business_date between p_from and p_to;
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', t.business_date,
    'kind', t.kind,
    'amount_minor', mm.amount_minor,
    'counted', t.kind <> 'transfer'
  ) order by t.business_date, t.created_at), '[]'::jsonb) into v_lines
  from public.money_movements mm
  join public.transactions t on t.id = mm.transaction_id
  where mm.business_id = p_business_id and t.status = 'posted'
    and mm.business_date between p_from and p_to;
  return jsonb_build_object('net_minor', v_net, 'lines', v_lines);
end $$;

create or replace function public.rpc_report_customer_debts(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'contact_id', contact_id, 'outstanding_minor', outstanding_minor
  )), '[]'::jsonb)
  from public.v_customer_balances
  where business_id = p_business_id and outstanding_minor <> 0 and public.is_member(p_business_id);
$$;

revoke all on function public.rpc_report_sales(uuid, date, date, jsonb) from public, anon;
revoke all on function public.rpc_report_money_received(uuid, date, date, jsonb) from public, anon;
revoke all on function public.rpc_report_expenses(uuid, date, date, jsonb) from public, anon;
revoke all on function public.rpc_report_stock_purchases(uuid, date, date, jsonb) from public, anon;
revoke all on function public.rpc_report_account_statement(uuid, date, date, jsonb) from public, anon;
revoke all on function public.rpc_report_cash_movement(uuid, date, date, jsonb) from public, anon;
revoke all on function public.rpc_report_customer_debts(uuid, date, date, jsonb) from public, anon;
grant execute on function public.rpc_report_sales(uuid, date, date, jsonb) to authenticated;
grant execute on function public.rpc_report_money_received(uuid, date, date, jsonb) to authenticated;
grant execute on function public.rpc_report_expenses(uuid, date, date, jsonb) to authenticated;
grant execute on function public.rpc_report_stock_purchases(uuid, date, date, jsonb) to authenticated;
grant execute on function public.rpc_report_account_statement(uuid, date, date, jsonb) to authenticated;
grant execute on function public.rpc_report_cash_movement(uuid, date, date, jsonb) to authenticated;
grant execute on function public.rpc_report_customer_debts(uuid, date, date, jsonb) to authenticated;
