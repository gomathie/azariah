begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;
create or replace function tests.create_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
  return v_id;
end $$;
create or replace function tests.authenticate(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create or replace function tests.clear_auth() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
grant execute on all functions in schema tests to anon, authenticated;

-- fixtures -------------------------------------------------------------------
select tests.create_user('spender@example.test') as uid \gset
select tests.create_user('other-spender@example.test') as uid_other \gset

select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner('cccccccc-0000-0000-0000-00000000000c', 'Ama''s Provision Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select id as cash from public.money_accounts where business_id = :'biz' and type = 'cash' \gset
select id as rent from public.categories where business_id = :'biz' and name = 'Rent' \gset
select id as stock_cat from public.categories where business_id = :'biz' and kind = 'stock_purchase' \gset
select tests.clear_auth();

select tests.authenticate(:'uid_other');
select (public.rpc_create_business_and_owner('dddddddd-0000-0000-0000-00000000000d', 'Other Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz_other \gset
select id as cash_other from public.money_accounts where business_id = :'biz_other' and type = 'cash' \gset
select tests.clear_auth();

select tests.authenticate(:'uid');

-- D. Operating expense: GHS 25 rent from cash -> cash −25, operating spending +25, sales unchanged
select public.rpc_record_expense('22222222-0000-0000-0000-000000000001', :'biz', now(), 2500, :'cash', :'rent', 'Rent', null) as expense_d \gset
select is((select balance_minor from public.v_account_balances where money_account_id = :'cash'), (-2500)::bigint, 'D: cash = −25');
select is((select sum(amount_minor) from public.transactions where business_id = :'biz' and kind = 'expense'), 2500::numeric, 'D: operating spending = 25');
select is((select coalesce(sum(amount_minor), 0) from public.transactions where business_id = :'biz' and kind = 'sale'), 0::numeric, 'D: sales unchanged');

-- E. Stock purchase: GHS 80 goods for resale -> cash −80 more, stock-purchase metric +80
select public.rpc_record_stock_purchase('22222222-0000-0000-0000-000000000002', :'biz', now(), 8000, :'cash', :'stock_cat', 'Goods', null);
select is((select balance_minor from public.v_account_balances where money_account_id = :'cash'), (-10500)::bigint, 'E: cash = −105');
select is((select sum(amount_minor) from public.transactions where business_id = :'biz' and kind = 'stock_purchase'), 8000::numeric, 'E: stock purchases = 80');
select is((select sum(amount_minor) from public.transactions where business_id = :'biz' and kind = 'expense'), 2500::numeric, 'E: operating spending stays 25');

-- G. Owner capital: GHS 200 added -> balance +200, sales still unchanged
select public.rpc_record_owner_movement('22222222-0000-0000-0000-000000000003', :'biz', now(), 20000, :'cash', 'contribution', 'Capital');
select is((select balance_minor from public.v_account_balances where money_account_id = :'cash'), 9500::bigint, 'G: cash = 95');
select is((select sum(amount_minor) from public.transactions where business_id = :'biz' and kind = 'owner_contribution'), 20000::numeric, 'G: contribution = 200');
select is((select coalesce(sum(amount_minor), 0) from public.transactions where business_id = :'biz' and kind = 'sale'), 0::numeric, 'G: sales unchanged');

-- H. Owner withdrawal: GHS 30 removed -> balance −30, operating expenses unchanged
select public.rpc_record_owner_movement('22222222-0000-0000-0000-000000000004', :'biz', now(), 3000, :'cash', 'withdrawal', null);
select is((select balance_minor from public.v_account_balances where money_account_id = :'cash'), 6500::bigint, 'H: cash = 65');
select is((select sum(amount_minor) from public.transactions where business_id = :'biz' and kind = 'expense'), 2500::numeric, 'H: operating expenses unchanged');
select is((select sum(amount_minor) from public.transactions where business_id = :'biz' and kind = 'owner_withdrawal'), 3000::numeric, 'H: withdrawal = 30');

-- Opening balance is cash, not a sale or an expense
select public.rpc_record_opening_balance('22222222-0000-0000-0000-000000000005', :'biz', :'cash', 10000, '2026-01-01');
select is((select balance_minor from public.v_account_balances where money_account_id = :'cash'), 16500::bigint, 'opening balance adds 100 to cash');
select is((select coalesce(sum(amount_minor), 0) from public.transactions where business_id = :'biz' and kind = 'sale'), 0::numeric, 'opening balance is not a sale');
select is((:'expense_d')::jsonb ->> 'kind', 'expense', 'D: result kind is expense');

-- I. Replay of D does not post a second expense
select is(
  public.rpc_record_expense('22222222-0000-0000-0000-000000000001', :'biz', now(), 99999, :'cash', :'rent', 'Replay', null),
  (:'expense_d')::jsonb,
  'I: replay returns the original expense'
);
select is((select count(*) from public.transactions where business_id = :'biz' and kind = 'expense'), 1::bigint, 'I: no duplicate expense');

-- Validation
select throws_like(
  format($$select public.rpc_record_expense(gen_random_uuid(), %L, now(), 0, %L, %L, null, null)$$, :'biz', :'cash', :'rent'),
  '%AZ_INVALID_AMOUNT%', 'zero amount rejected');
select throws_like(
  format($$select public.rpc_record_expense(gen_random_uuid(), %L, now(), 500, %L, %L, null, null)$$, :'biz', :'cash_other', :'rent'),
  '%AZ_FORBIDDEN%', 'account from another business rejected');
select throws_like(
  format($$select public.rpc_record_owner_movement(gen_random_uuid(), %L, now(), 500, %L, 'gift', null)$$, :'biz', :'cash'),
  '%AZ_INVALID_INPUT%', 'unknown owner direction rejected');
select tests.clear_auth();

select * from finish();
rollback;
