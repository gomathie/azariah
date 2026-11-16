begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- helpers --------------------------------------------------------------------
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

-- fixtures -------------------------------------------------------------------
select tests.create_user('ama@example.test') as uid \gset
select is((select count(*) from public.profiles where id = :'uid'), 1::bigint, 'profile auto-created for new auth user');

select tests.authenticate(:'uid');

select public.rpc_create_business_and_owner(
  '11111111-1111-1111-1111-111111111111', 'Ama''s Provision Shop', 'retail', 'GH', 'Africa/Accra', 'GHS'
) as created \gset

select ok((:'created')::jsonb ? 'business_id', 'returns business_id');
select (:'created')::jsonb ->> 'business_id' as bid \gset

select is((select name from public.businesses where id = :'bid'), 'Ama''s Provision Shop', 'business created with trimmed name');
select is((select minor_unit from public.businesses where id = :'bid'), 2::smallint, 'GHS has 2 minor units');
select is((select role::text from public.business_memberships where business_id = :'bid' and user_id = :'uid'), 'owner', 'caller is owner');
select is((select count(*) from public.money_accounts where business_id = :'bid'), 2::bigint, 'Cash and Mobile Money accounts seeded');
select ok((select count(*) from public.categories where business_id = :'bid' and kind = 'operating_expense') >= 6, 'operating expense categories seeded');
select is((select count(*) from public.categories where business_id = :'bid' and kind = 'stock_purchase' and name = 'Goods for resale'), 1::bigint, 'retail stock category seeded');
select is((select count(*) from public.audit_events where business_id = :'bid' and action = 'business.created'), 1::bigint, 'audit event written');

-- idempotent replay ------------------------------------------------------------
select is(
  public.rpc_create_business_and_owner('11111111-1111-1111-1111-111111111111', 'Different name', 'food', 'NG', 'Africa/Lagos', 'NGN'),
  (:'created')::jsonb,
  'replaying the same client_operation_id returns the original result'
);
select is((select count(*) from public.businesses where created_by = :'uid'), 1::bigint, 'replay did not create a second business');

-- validation -------------------------------------------------------------------
select throws_like(
  $$select public.rpc_create_business_and_owner('22222222-2222-2222-2222-222222222222', '', 'retail', 'GH', 'Africa/Accra', 'GHS')$$,
  '%AZ_INVALID_INPUT%', 'empty name rejected'
);
select throws_like(
  $$select public.rpc_create_business_and_owner('33333333-3333-3333-3333-333333333333', 'Shop', 'retail', 'GH', 'Mars/Olympus', 'GHS')$$,
  '%AZ_INVALID_INPUT%', 'unknown timezone rejected'
);

-- XOF business has 0 minor units
select public.rpc_create_business_and_owner('44444444-4444-4444-4444-444444444444', 'Boutique', 'retail', 'CI', 'Africa/Abidjan', 'XOF') as xof \gset
select is((select minor_unit from public.businesses where id = ((:'xof')::jsonb ->> 'business_id')::uuid), 0::smallint, 'XOF has 0 minor units');

select tests.clear_auth();
select * from finish();
rollback;
