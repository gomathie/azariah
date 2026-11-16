-- Dashboard totals for one business and a business-date range.
-- Money received is cash from sales and later customer payments, not owner money and not transfers.
-- Net cash movement is every account movement. Transfers cancel out. Customer debt is what is still owed.

create or replace function public.rpc_get_dashboard_summary(
  p_business_id uuid,
  p_from date default null,
  p_to date default null
) returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_sales bigint;
  v_received bigint;
  v_expenses bigint;
  v_stock bigint;
  v_debts bigint;
  v_net bigint;
  v_accounts jsonb;
begin
  perform public.assert_member(p_business_id);

  select coalesce(sum(amount_minor), 0) into v_sales
  from public.transactions
  where business_id = p_business_id and kind = 'sale' and status = 'posted'
    and (p_from is null or business_date >= p_from)
    and (p_to is null or business_date <= p_to);

  select coalesce(sum(mm.amount_minor), 0) into v_received
  from public.money_movements mm
  join public.transactions t on t.id = mm.transaction_id
  where mm.business_id = p_business_id and t.status = 'posted' and t.kind in ('sale', 'collection')
    and (p_from is null or mm.business_date >= p_from)
    and (p_to is null or mm.business_date <= p_to);

  select coalesce(sum(amount_minor), 0) into v_expenses
  from public.transactions
  where business_id = p_business_id and kind = 'expense' and status = 'posted'
    and (p_from is null or business_date >= p_from)
    and (p_to is null or business_date <= p_to);

  select coalesce(sum(amount_minor), 0) into v_stock
  from public.transactions
  where business_id = p_business_id and kind = 'stock_purchase' and status = 'posted'
    and (p_from is null or business_date >= p_from)
    and (p_to is null or business_date <= p_to);

  select coalesce(sum(outstanding_minor), 0) into v_debts
  from public.v_customer_balances
  where business_id = p_business_id;

  select coalesce(sum(amount_minor), 0) into v_net
  from public.money_movements
  where business_id = p_business_id
    and (p_from is null or business_date >= p_from)
    and (p_to is null or business_date <= p_to);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', money_account_id,
    'name', name,
    'type', type,
    'balance_minor', balance_minor
  ) order by sort_order, name), '[]'::jsonb)
  into v_accounts
  from public.v_account_balances
  where business_id = p_business_id;

  return jsonb_build_object(
    'sales_minor', v_sales,
    'money_received_minor', v_received,
    'operating_expenses_minor', v_expenses,
    'stock_purchases_minor', v_stock,
    'net_cash_movement_minor', v_net,
    'customer_debts_minor', v_debts,
    'accounts', v_accounts
  );
end $$;

revoke all on function public.rpc_get_dashboard_summary(uuid, date, date) from public, anon;
grant execute on function public.rpc_get_dashboard_summary(uuid, date, date) to authenticated;
