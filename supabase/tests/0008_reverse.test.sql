begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

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

select tests.create_user('fixer@example.test') as uid \gset
select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Ama Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select id as cash from public.money_accounts where business_id = :'biz' and type = 'cash' \gset
select (public.rpc_create_sale(gen_random_uuid(), :'biz', now(), 10000, 10000, :'cash', null, null, 'Wrong sale', null) ->> 'transaction_id') as sale \gset
select public.rpc_reverse_transaction('44444444-0000-0000-0000-000000000001', :'biz', :'sale', 'Entered by mistake') as reversed \gset

select is((select balance_minor from public.v_account_balances where money_account_id = :'cash'), 0::bigint, 'J: cash corrected');
select is((select status from public.transactions where id = :'sale'), 'reversed', 'J: original marked reversed');
select tests.clear_auth();
select is((select count(*) from public.audit_events where business_id = :'biz' and action = 'transaction.reversed'), 1::bigint, 'J: audit trail');
select tests.authenticate(:'uid');
select is(public.rpc_reverse_transaction('44444444-0000-0000-0000-000000000001', :'biz', :'sale', 'again'), (:'reversed')::jsonb, 'J: replay returns the first reversal');
select throws_like(format($$select public.rpc_reverse_transaction(gen_random_uuid(), %L, %L, 'twice')$$, :'biz', :'sale'), '%AZ_ALREADY_REVERSED%', 'second reversal rejected');

select * from finish();
rollback;
