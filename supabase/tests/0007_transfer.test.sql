begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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

select tests.create_user('mover@example.test') as uid \gset
select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Ama Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select id as cash from public.money_accounts where business_id = :'biz' and type = 'cash' \gset
select id as momo from public.money_accounts where business_id = :'biz' and type = 'mobile_money' \gset

-- Give cash GHS 50 so the transfer is visible, then move it to MoMo.
select public.rpc_record_owner_movement(gen_random_uuid(), :'biz', now(), 5000, :'cash', 'contribution', null);
select (public.rpc_transfer_between_accounts(gen_random_uuid(), :'biz', now(), :'cash', :'momo', 5000, null) ->> 'transaction_id') as tx \gset

select is((select balance_minor from public.v_account_balances where money_account_id = :'cash'), 0::bigint, 'F: cash down 50');
select is((select balance_minor from public.v_account_balances where money_account_id = :'momo'), 5000::bigint, 'F: MoMo up 50');
select is((select sum(amount_minor) from public.money_movements where transaction_id = :'tx'), 0::bigint, 'F: transfer movements sum to 0');
select is((select coalesce(sum(amount_minor), 0) from public.transactions where business_id = :'biz' and kind = 'sale'), 0::numeric, 'F: not a sale');
select throws_like(format($$select public.rpc_transfer_between_accounts(gen_random_uuid(), %L, now(), %L, %L, 100, null)$$, :'biz', :'cash', :'cash'), '%AZ_SAME_ACCOUNT%', 'same account rejected');
select throws_like(format($$select public.rpc_transfer_between_accounts(gen_random_uuid(), %L, now(), %L, %L, 0, null)$$, :'biz', :'cash', :'momo'), '%AZ_INVALID_AMOUNT%', 'zero amount rejected');

select * from finish();
rollback;
