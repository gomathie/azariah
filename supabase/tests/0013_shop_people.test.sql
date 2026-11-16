begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

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

select tests.create_user('owner-shop@example.test') as uid \gset
select tests.create_user('staff-shop@example.test') as uid_staff \gset
select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Ama Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
insert into public.business_memberships (business_id, user_id, role, status)
values (:'biz', :'uid_staff', 'staff', 'active');

select public.rpc_add_shop_person(gen_random_uuid(), :'biz', 'Kofi', 'Counter phone', 'staff') as added \gset
select is(((:'added')::jsonb ->> 'role'), 'staff', 'a helper is staff');
select is((public.rpc_add_shop_person(gen_random_uuid(), :'biz', 'Abena', 'Abena phone', 'manager') ->> 'role'), 'manager', 'the owner can add an admin');

select tests.authenticate(:'uid_staff');
select throws_like(
  format($$select public.rpc_add_shop_person(gen_random_uuid(), %L, 'Kojo', 'Kojo phone', 'staff')$$, :'biz'),
  '%AZ_FORBIDDEN%',
  'staff cannot add a person'
);

select * from finish();
rollback;
