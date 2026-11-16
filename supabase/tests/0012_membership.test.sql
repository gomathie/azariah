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

select tests.create_user('owner-member@example.test') as uid \gset
select tests.create_user('manager-member@example.test') as uid_manager \gset
select tests.create_user('staff-member@example.test') as uid_staff \gset
select tests.create_user('new-member@example.test') as uid_new \gset
select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Ama Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select public.rpc_invite_member(gen_random_uuid(), :'biz', 'manager-member@example.test', 'manager');
select public.rpc_invite_member(gen_random_uuid(), :'biz', 'staff-member@example.test', 'staff');
select id as staff_membership from public.business_memberships where business_id = :'biz' and user_id = :'uid_staff' \gset

select tests.authenticate(:'uid_staff');
select throws_like(format($$select public.rpc_change_membership(gen_random_uuid(), %L, %L, 'owner', null)$$, :'biz', :'staff_membership'), '%AZ_FORBIDDEN%', 'staff cannot grant owner');

select tests.authenticate(:'uid_manager');
select throws_like(format($$select public.rpc_invite_member(gen_random_uuid(), %L, 'new-member@example.test', 'owner')$$, :'biz'), '%AZ_FORBIDDEN%', 'manager cannot invite an owner');

select tests.authenticate(:'uid');
select is((public.rpc_invite_member(gen_random_uuid(), :'biz', 'new-member@example.test', 'staff') ->> 'role'), 'staff', 'owner can invite staff');

select * from finish();
rollback;
