begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

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
grant execute on all functions in schema tests to anon, authenticated;

select tests.create_user('dash@example.test') as uid \gset
select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Ama Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select id as cash from public.money_accounts where business_id = :'biz' and type = 'cash' \gset
select id as momo from public.money_accounts where business_id = :'biz' and type = 'mobile_money' \gset
select id as rent from public.categories where business_id = :'biz' and name = 'Rent' \gset
select id as stock_cat from public.categories where business_id = :'biz' and kind = 'stock_purchase' \gset
insert into public.contacts (business_id, name) values (:'biz', 'Kofi') returning id as kofi \gset

-- A–H in minor units. GHS 100 = 10000.
select public.rpc_create_sale(gen_random_uuid(), :'biz', now(), 10000, 10000, :'cash', null, null, 'A', null);
select public.rpc_create_sale(gen_random_uuid(), :'biz', now(), 10000, 6000, :'momo', :'kofi', null, 'B', null);
select public.rpc_record_collection(gen_random_uuid(), :'biz', now(), :'kofi', 4000, :'cash', null);
select public.rpc_record_expense(gen_random_uuid(), :'biz', now(), 2500, :'cash', :'rent', 'Rent', null);
select public.rpc_record_stock_purchase(gen_random_uuid(), :'biz', now(), 8000, :'cash', :'stock_cat', 'Goods', null);
select public.rpc_transfer_between_accounts(gen_random_uuid(), :'biz', now(), :'cash', :'momo', 5000, null);
select public.rpc_record_owner_movement(gen_random_uuid(), :'biz', now(), 20000, :'cash', 'contribution', null);
select public.rpc_record_owner_movement(gen_random_uuid(), :'biz', now(), 3000, :'cash', 'withdrawal', null);
select public.rpc_get_dashboard_summary(:'biz', null, null) as summary \gset

select is(((:'summary')::jsonb ->> 'sales_minor'), '20000', 'sales 200');
select is(((:'summary')::jsonb ->> 'money_received_minor'), '20000', 'money received 200');
select is(((:'summary')::jsonb ->> 'operating_expenses_minor'), '2500', 'operating expenses 25');
select is(((:'summary')::jsonb ->> 'stock_purchases_minor'), '8000', 'stock purchases 80');
select is(((:'summary')::jsonb ->> 'customer_debts_minor'), '0', 'customer debts 0');
select is(((:'summary')::jsonb ->> 'net_cash_movement_minor'), '26500', 'net cash 265');
select is((select sum((a ->> 'balance_minor')::bigint) from jsonb_array_elements((:'summary')::jsonb -> 'accounts') a), 26500::numeric, 'accounts sum to 265');

select * from finish();
rollback;
