begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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
  -- RESET ROLE is always permitted; it returns to the session (superuser) role.
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
grant execute on all functions in schema tests to anon, authenticated;

select tests.create_user('breakdown@example.test') as uid \gset
select tests.create_user('outsider@example.test') as uid_out \gset
select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Breakdown Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select id as cash from public.money_accounts where business_id = :'biz' and type = 'cash' \gset
select id as momo from public.money_accounts where business_id = :'biz' and type = 'mobile_money' \gset
select id as transport from public.categories where business_id = :'biz' and kind = 'operating_expense' and name = 'Transport' \gset
select id as stockcat from public.categories where business_id = :'biz' and kind = 'stock_purchase' limit 1 \gset

select public.rpc_create_sale(gen_random_uuid(), :'biz', '2026-01-05 10:00+00', 10000, 10000, :'cash', null, null, 'A', null);
select public.rpc_create_sale(gen_random_uuid(), :'biz', '2026-01-05 15:00+00', 2000, 2000, :'momo', null, null, 'B', null);
select public.rpc_create_sale(gen_random_uuid(), :'biz', '2026-01-07 09:00+00', 5000, 5000, :'momo', null, null, 'C', null);
select public.rpc_record_expense(gen_random_uuid(), :'biz', '2026-01-06 09:00+00', 2500, :'cash', :'transport', 'Bus', null);
select public.rpc_record_stock_purchase(gen_random_uuid(), :'biz', '2026-01-06 11:00+00', 8000, :'cash', :'stockcat', 'Goods', null);

select public.rpc_report_sales(:'biz', '2026-01-01', '2026-01-31') as sales \gset
select is((:'sales')::jsonb ->> 'total_minor', '17000', 'sales total is 170');
select is(jsonb_array_length((:'sales')::jsonb -> 'lines'), 2, 'sales are grouped into two days');
select is((:'sales')::jsonb -> 'lines' -> 0, '{"date":"2026-01-05","count":2,"total_minor":12000}'::jsonb, 'first day has two sales worth 120');
select is((select sum((l ->> 'total_minor')::bigint) from jsonb_array_elements((:'sales')::jsonb -> 'lines') l), 17000::numeric, 'day lines add up to the total');

select public.rpc_report_money_received(:'biz', '2026-01-01', '2026-01-31') as recv \gset
select is((:'recv')::jsonb -> 'lines', '[{"name":"Cash","total_minor":10000},{"name":"Mobile Money","total_minor":7000}]'::jsonb, 'money received is split by account');

select public.rpc_report_expenses(:'biz', '2026-01-01', '2026-01-31') as exp \gset
select is((:'exp')::jsonb ->> 'total_minor', '2500', 'expenses total is 25');
select is((:'exp')::jsonb -> 'lines', '[{"name":"Transport","total_minor":2500}]'::jsonb, 'expenses are split by category');

select public.rpc_report_stock_purchases(:'biz', '2026-01-01', '2026-01-31') as stock \gset
select is((:'stock')::jsonb ->> 'total_minor', '8000', 'stock purchases total is 80 and is not mixed into expenses');
select is(jsonb_array_length((:'stock')::jsonb -> 'lines'), 1, 'stock purchases have one category line');

select is((public.rpc_report_sales(:'biz', '2026-01-06', '2026-01-06')) -> 'lines', '[]'::jsonb, 'a day with no sales gives no lines');
select tests.clear_auth();

-- Someone who is not a member gets nothing, not another shop's figures.
select tests.authenticate(:'uid_out');
select is(public.rpc_report_sales(:'biz', '2026-01-01', '2026-01-31'), '{"total_minor":0,"lines":[]}'::jsonb, 'non-member sees zero and no lines');
select tests.clear_auth();

select * from finish();
rollback;
