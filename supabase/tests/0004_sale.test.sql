begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

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

-- fixtures -------------------------------------------------------------------
select tests.create_user('seller@example.test') as uid \gset
select tests.create_user('other@example.test') as uid_other \gset

select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner('aaaaaaaa-0000-0000-0000-00000000000a', 'Ama''s Provision Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select id as cash from public.money_accounts where business_id = :'biz' and type = 'cash' \gset
select id as momo from public.money_accounts where business_id = :'biz' and type = 'mobile_money' \gset
insert into public.contacts (business_id, name) values (:'biz', 'Kofi') returning id as kofi \gset
select tests.clear_auth();

select tests.authenticate(:'uid_other');
select (public.rpc_create_business_and_owner('bbbbbbbb-0000-0000-0000-00000000000b', 'Other Shop', 'retail', 'US', 'America/New_York', 'USD') ->> 'business_id') as biz_other \gset
select id as cash_other from public.money_accounts where business_id = :'biz_other' and type = 'cash' \gset
select tests.clear_auth();

select tests.authenticate(:'uid');

-- A. Paid sale: GHS 100 fully paid in cash -> sales +100, cash +100, debts 0 -------------------
select public.rpc_create_sale('11111111-0000-0000-0000-000000000001', :'biz', now(), 10000, 10000, :'cash', null, null, 'Rice', null) as sale_a \gset
select is((:'sale_a')::jsonb ->> 'credit_minor', '0', 'A: no credit');
select is((select sum(amount_minor) from public.transactions where business_id = :'biz' and kind = 'sale'), 10000::numeric, 'A: sales = 100');
select is((select balance_minor from public.v_account_balances where money_account_id = :'cash'), 10000::bigint, 'A: cash = 100');
select is((select count(*) from public.v_customer_balances where business_id = :'biz'), 0::bigint, 'A: no customer debts');

-- B. Credit sale: GHS 100, GHS 60 via MoMo, 40 on credit to Kofi ------------------------------
select public.rpc_create_sale('11111111-0000-0000-0000-000000000002', :'biz', now(), 10000, 6000, :'momo', :'kofi', null, 'Oil', null) as sale_b \gset
select ok(((:'sale_b')::jsonb ->> 'receivable_id') is not null, 'B: receivable created');
select is((select sum(amount_minor) from public.transactions where business_id = :'biz' and kind = 'sale'), 20000::numeric, 'B: sales = 200');
select is((select balance_minor from public.v_account_balances where money_account_id = :'momo'), 6000::bigint, 'B: MoMo = 60');
select is((select outstanding_minor from public.v_customer_balances where contact_id = :'kofi'), 4000::bigint, 'B: Kofi owes 40');
select is((select amount_minor from public.receivables where transaction_id = ((:'sale_b')::jsonb ->> 'transaction_id')::uuid), 4000::bigint, 'B: receivable = 40');

-- I. Idempotent replay of B --------------------------------------------------------------------
select is(public.rpc_create_sale('11111111-0000-0000-0000-000000000002', :'biz', now(), 99999, 99999, :'cash', null, null, 'Replay', null),
          (:'sale_b')::jsonb, 'I: replay returns original result');
select is((select count(*) from public.transactions where business_id = :'biz'), 2::bigint, 'I: no duplicate transaction');
select is((select balance_minor from public.v_account_balances where money_account_id = :'momo'), 6000::bigint, 'I: MoMo unchanged');

-- Validation --------------------------------------------------------------------------------------
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 10000, 4000, null, null, null, null, null)$$, :'biz'),
  '%AZ_CONTACT_REQUIRED%', 'credit without customer rejected');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 10000, 12000, %L, null, null, null, null)$$, :'biz', :'cash'),
  '%AZ_INVALID_AMOUNT%', 'received > amount rejected');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 0, 0, %L, null, null, null, null)$$, :'biz', :'cash'),
  '%AZ_INVALID_AMOUNT%', 'zero amount rejected');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 500, 500, %L, null, null, null, null)$$, :'biz', :'cash_other'),
  '%AZ_NOT_FOUND%', 'account from another business rejected');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 500, 500, %L, null, null, null, null)$$, :'biz_other', :'cash_other'),
  '%AZ_FORBIDDEN%', 'L: non-member cannot sell in another business');
select tests.clear_auth();

-- K. Date boundary: 03:30 UTC on 2 Jan is still 1 Jan in New York -----------------------------
select tests.authenticate(:'uid_other');
select public.rpc_create_sale('11111111-0000-0000-0000-000000000003', :'biz_other', '2026-01-02 03:30:00+00', 500, 500, :'cash_other', null, null, null, null) as sale_k \gset
select is((:'sale_k')::jsonb ->> 'business_date', '2026-01-01', 'K: business_date uses business timezone');
select tests.clear_auth();

select * from finish();
rollback;
