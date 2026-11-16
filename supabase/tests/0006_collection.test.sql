begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

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

select tests.create_user('collector@example.test') as uid \gset
select tests.create_user('collector-other@example.test') as uid_other \gset

select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner('eeeeeeee-0000-0000-0000-00000000000e', 'Ama''s Provision Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select id as cash from public.money_accounts where business_id = :'biz' and type = 'cash' \gset
select id as momo from public.money_accounts where business_id = :'biz' and type = 'mobile_money' \gset
insert into public.contacts (business_id, name) values (:'biz', 'Kofi') returning id as kofi \gset
insert into public.contacts (business_id, name) values (:'biz', 'Abena') returning id as abena \gset
select tests.clear_auth();

select tests.authenticate(:'uid_other');
select (public.rpc_create_business_and_owner('ffffffff-0000-0000-0000-00000000000f', 'Other Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz_other \gset
select id as cash_other from public.money_accounts where business_id = :'biz_other' and type = 'cash' \gset
select tests.clear_auth();

select tests.authenticate(:'uid');

-- Credit sale GHS 100, GHS 60 via MoMo, GHS 40 owed by Kofi
select public.rpc_create_sale('33333333-0000-0000-0000-000000000001', :'biz', now(), 10000, 6000, :'momo', :'kofi', null, 'Oil', null);

-- C. GHS 40 collected later: debt 0, cash +40, sales unchanged
select public.rpc_record_collection('33333333-0000-0000-0000-000000000002', :'biz', now(), :'kofi', 4000, :'cash', null) as collection_c \gset
select is((select balance_minor from public.v_account_balances where money_account_id = :'cash'), 4000::bigint, 'C: cash +40');
select is((select balance_minor from public.v_account_balances where money_account_id = :'momo'), 6000::bigint, 'C: MoMo stays 60');
select is((select outstanding_minor from public.v_customer_balances where contact_id = :'kofi'), 0::bigint, 'C: Kofi owes 0');
select is((select sum(amount_minor) from public.transactions where business_id = :'biz' and kind = 'sale'), 10000::numeric, 'C: sales unchanged');
select is((select count(*) from public.transactions where business_id = :'biz' and kind = 'sale'), 1::bigint, 'C: no new sale');
select is((select count(*) from public.transactions where business_id = :'biz' and kind = 'collection'), 1::bigint, 'C: one collection');

select is(
  public.rpc_record_collection('33333333-0000-0000-0000-000000000002', :'biz', now(), :'kofi', 1, :'cash', 'replay'),
  (:'collection_c')::jsonb,
  'I: replay returns the original collection'
);
select is((select count(*) from public.transactions where business_id = :'biz' and kind = 'collection'), 1::bigint, 'I: no duplicate collection');

select throws_like(
  format($$select public.rpc_record_collection(gen_random_uuid(), %L, now(), %L, 1, %L, null)$$, :'biz', :'kofi', :'cash'),
  '%AZ_EXCEEDS_DEBT%', 'overpayment rejected');

-- Oldest debt is settled first. now() does not move inside one transaction, so the
-- first receivable is stamped earlier before the payment.
select (public.rpc_create_sale(gen_random_uuid(), :'biz', now(), 3000, 0, null, :'abena', null, 'First', null) ->> 'receivable_id') as older \gset
select public.rpc_create_sale(gen_random_uuid(), :'biz', now(), 5000, 0, null, :'abena', null, 'Second', null);
select tests.clear_auth();
update public.receivables set created_at = created_at - interval '1 minute' where id = :'older';
select tests.authenticate(:'uid');
select public.rpc_record_collection(gen_random_uuid(), :'biz', now(), :'abena', 4000, :'cash', null);
select is((select status from public.receivables where id = :'older'), 'settled', 'FIFO: oldest debt settled');
select is((select outstanding_minor from public.v_customer_balances where contact_id = :'abena'), 4000::bigint, 'FIFO: newest debt still 40');

select tests.clear_auth();
select tests.authenticate(:'uid');
select public.rpc_get_customer_statement(:'biz', :'kofi', null, null) as statement \gset
select is(((:'statement')::jsonb -> -1 ->> 'balance_minor'), '0', 'statement ends at nothing owed');

select throws_like(
  format($$select public.rpc_record_collection(gen_random_uuid(), %L, now(), %L, 100, %L, null)$$, :'biz', :'abena', :'cash_other'),
  '%AZ_FORBIDDEN%', 'account from another business rejected');
select tests.clear_auth();

select * from finish();
rollback;
