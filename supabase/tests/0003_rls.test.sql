begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create schema if not exists tests;
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
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- Two users, two businesses -------------------------------------------------
select tests.create_user('a@example.test') as uid_a \gset
select tests.create_user('b@example.test') as uid_b \gset

select tests.authenticate(:'uid_a');
select (public.rpc_create_business_and_owner('aaaaaaaa-0000-0000-0000-000000000001', 'Shop A', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz_a \gset
select tests.clear_auth();

select tests.authenticate(:'uid_b');
select (public.rpc_create_business_and_owner('bbbbbbbb-0000-0000-0000-000000000001', 'Shop B', 'food', 'NG', 'Africa/Lagos', 'NGN') ->> 'business_id') as biz_b \gset
select tests.clear_auth();

-- Seed one transaction in each business directly as superuser (RPCs for sales come later).
insert into public.contacts (id, business_id, name) values
  ('cccccccc-0000-0000-0000-00000000000a', :'biz_a', 'Kofi'),
  ('cccccccc-0000-0000-0000-00000000000b', :'biz_b', 'Bola');
insert into public.transactions (business_id, kind, occurred_at, business_date, amount_minor, currency_code, client_operation_id, created_by) values
  (:'biz_a', 'sale', now(), current_date, 10000, 'GHS', 'dddddddd-0000-0000-0000-00000000000a', :'uid_a'),
  (:'biz_b', 'sale', now(), current_date, 20000, 'NGN', 'dddddddd-0000-0000-0000-00000000000b', :'uid_b');

-- User A sees only A ----------------------------------------------------------
select tests.authenticate(:'uid_a');
select is((select count(*) from public.businesses), 1::bigint, 'A sees exactly one business');
select is((select name from public.businesses), 'Shop A', 'A sees Shop A');
select is((select count(*) from public.business_memberships), 1::bigint, 'A sees only own membership');
select is((select count(*) from public.contacts), 1::bigint, 'A sees only own contacts');
select is((select count(*) from public.transactions), 1::bigint, 'A sees only own transactions');
select is((select count(*) from public.transactions where business_id = :'biz_b'), 0::bigint, 'A cannot read B transactions even by id');
select is((select count(*) from public.v_account_balances), 2::bigint, 'A sees own two account balances via view');
select is((select count(*) from public.v_account_balances where business_id = :'biz_b'), 0::bigint, 'view does not leak B balances');

-- A cannot write financial tables directly
select throws_ok(
  $$insert into public.transactions (business_id, kind, occurred_at, business_date, amount_minor, currency_code, client_operation_id, created_by)
    values (current_setting('tests.biz_a', true)::uuid, 'sale', now(), current_date, 1, 'GHS', gen_random_uuid(), auth.uid())$$,
  '42501', null, 'A cannot insert into transactions directly'
);

-- A cannot forge a contact into B
select throws_ok(
  format($$insert into public.contacts (business_id, name) values (%L, 'Forged')$$, :'biz_b'),
  '42501', null, 'A cannot insert a contact with B business_id'
);

-- A cannot update B's business even by id
select lives_ok(format($$update public.businesses set name = 'Hacked' where id = %L$$, :'biz_b'), 'update of B by A runs');
select tests.clear_auth();
select is((select name from public.businesses where id = :'biz_b'), 'Shop B', 'B name unchanged (0 rows matched under RLS)');

-- A staff member cannot promote themselves (no update grant on memberships)
select tests.authenticate(:'uid_a');
select throws_ok(
  format($$update public.business_memberships set role = 'owner' where business_id = %L$$, :'biz_b'),
  '42501', null, 'memberships are not updatable through the API'
);

-- audit and sync tables are not readable
select throws_ok($$select count(*) from public.audit_events$$, '42501', null, 'audit_events not readable');
select throws_ok($$select count(*) from public.sync_operations$$, '42501', null, 'sync_operations not readable');
select tests.clear_auth();

-- anon sees nothing
select set_config('role', 'anon', true);
select throws_ok($$select count(*) from public.businesses$$, '42501', null, 'anon cannot read businesses');
select tests.clear_auth();

select * from finish();
rollback;
