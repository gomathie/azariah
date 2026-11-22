-- Reports gain a breakdown next to the total: sales by day, money received by account,
-- expenses and stock purchases by category. `total_minor` is unchanged, so older clients keep working.
-- Grouping happens here, on indexed (business_id, business_date) rows, never in the browser.

create or replace function public.rpc_report_sales(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with picked as (
    select business_date, amount_minor
    from public.transactions
    where business_id = p_business_id and kind = 'sale' and status = 'posted'
      and business_date between p_from and p_to
      and public.is_member(p_business_id)
  ), days as (
    select business_date, count(*) as n, sum(amount_minor) as s from picked group by business_date
  )
  select jsonb_build_object(
    'total_minor', coalesce((select sum(amount_minor) from picked), 0),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('date', business_date, 'count', n, 'total_minor', s)
                                        order by business_date) from days), '[]'::jsonb));
$$;

create or replace function public.rpc_report_money_received(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with picked as (
    select mm.money_account_id, mm.amount_minor
    from public.money_movements mm
    join public.transactions t on t.id = mm.transaction_id
    where mm.business_id = p_business_id and t.status = 'posted' and t.kind in ('sale', 'collection')
      and mm.business_date between p_from and p_to
      and public.is_member(p_business_id)
  ), by_account as (
    select a.name, a.sort_order, sum(p.amount_minor) as s
    from picked p join public.money_accounts a on a.id = p.money_account_id
    group by a.id, a.name, a.sort_order
  )
  select jsonb_build_object(
    'total_minor', coalesce((select sum(amount_minor) from picked), 0),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'total_minor', s) order by sort_order, name)
                       from by_account), '[]'::jsonb));
$$;

create or replace function public.rpc_report_expenses(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with picked as (
    select category_id, amount_minor
    from public.transactions
    where business_id = p_business_id and kind = 'expense' and status = 'posted'
      and business_date between p_from and p_to
      and public.is_member(p_business_id)
  ), by_category as (
    select c.name, sum(p.amount_minor) as s
    from picked p left join public.categories c on c.id = p.category_id
    group by c.name
  )
  select jsonb_build_object(
    'total_minor', coalesce((select sum(amount_minor) from picked), 0),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'total_minor', s) order by s desc, name)
                       from by_category), '[]'::jsonb));
$$;

create or replace function public.rpc_report_stock_purchases(p_business_id uuid, p_from date, p_to date, p_filters jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with picked as (
    select category_id, amount_minor
    from public.transactions
    where business_id = p_business_id and kind = 'stock_purchase' and status = 'posted'
      and business_date between p_from and p_to
      and public.is_member(p_business_id)
  ), by_category as (
    select c.name, sum(p.amount_minor) as s
    from picked p left join public.categories c on c.id = p.category_id
    group by c.name
  )
  select jsonb_build_object(
    'total_minor', coalesce((select sum(amount_minor) from picked), 0),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'total_minor', s) order by s desc, name)
                       from by_category), '[]'::jsonb));
$$;
