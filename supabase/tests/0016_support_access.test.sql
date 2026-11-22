begin;
create extension if not exists pgtap with schema extensions;
select plan(47);

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

select tests.create_user('owner-a@example.test') as owner_a \gset
select tests.create_user('owner-b@example.test') as owner_b \gset
select tests.create_user('support@example.test') as admin \gset
select tests.create_user('nobody@example.test') as nobody \gset
insert into public.platform_admins (user_id, note) values (:'admin', 'test admin');

select tests.authenticate(:'owner_a');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Zqx Support Shop A', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz_a \gset
select id as cash_a from public.money_accounts where business_id = :'biz_a' and type = 'cash' \gset
select (public.rpc_create_sale(gen_random_uuid(), :'biz_a', now(), 10000, 10000, :'cash_a', null, null, 'Rice', null) ->> 'transaction_id') as sale_a \gset
select tests.clear_auth();

select tests.authenticate(:'owner_b');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Zqx Support Shop B', 'food', 'NG', 'Africa/Lagos', 'NGN') ->> 'business_id') as biz_b \gset
select id as cash_b from public.money_accounts where business_id = :'biz_b' and type = 'cash' \gset
select public.rpc_create_sale(gen_random_uuid(), :'biz_b', now(), 5000, 5000, :'cash_b', null, null, 'Jollof', null);
select tests.clear_auth();

-- 1. An ordinary user is not an admin and cannot make themselves one -------------------------------
select tests.authenticate(:'nobody');
select is(public.rpc_admin_whoami() ->> 'is_platform_admin', 'false', 'ordinary user is not a platform admin');
select throws_like($$select public.rpc_admin_list_businesses()$$, '%AZ_FORBIDDEN%', 'ordinary user cannot list shops');
select throws_like(format($$select public.rpc_admin_set_business_status(%L, 'suspended', 'because')$$, :'biz_a'), '%AZ_FORBIDDEN%', 'ordinary user cannot suspend a shop');
select throws_ok(format($$insert into public.platform_admins (user_id) values (%L)$$, :'nobody'), '42501', null, 'nobody can insert themselves as admin');
select throws_ok($$select count(*) from public.platform_admins$$, '42501', null, 'the admin list is not readable through the API');
select throws_like(format($$select public.rpc_grant_support_access(%L, 24, null)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'a non-owner cannot grant support access to a shop');
select tests.clear_auth();

-- 2. An admin WITHOUT a grant sees the directory and nothing inside any shop -------------------------
select tests.authenticate(:'admin');
select is(public.rpc_admin_whoami() ->> 'is_platform_admin', 'true', 'admin is recognised');
select is((select count(*) from public.businesses), 0::bigint, 'admin without a grant sees no business rows');
select is((select count(*) from public.transactions), 0::bigint, 'admin without a grant sees no entries');
select is((select count(*) from public.v_account_balances), 0::bigint, 'admin without a grant sees no balances');
select throws_like(format($$select public.rpc_get_dashboard_summary(%L, current_date, current_date)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'admin without a grant cannot read the dashboard');
select throws_like(format($$select public.rpc_admin_open_business(%L)$$, :'biz_a'), '%AZ_SUPPORT_NOT_GRANTED%', 'admin cannot open a shop without the owner''s grant');
select public.rpc_admin_list_businesses('Zqx Support Shop') as directory \gset
select is(jsonb_array_length((:'directory')::jsonb), 2, 'directory lists both shops');
select ok(not ((:'directory')::jsonb -> 0) ?| array['sales_minor','balance_minor','amount_minor','contacts','transactions'], 'directory rows carry no money or customer fields');
select is(jsonb_array_length(public.rpc_admin_list_businesses('owner-a@')), 1, 'admin can find a shop by its owner''s email');
select is(jsonb_array_length(public.rpc_admin_list_businesses('%')), 0, 'a percent sign in the search is matched literally, not as a wildcard');
select tests.clear_auth();

-- 3. The owner grants access; the admin can read that shop and only that shop ------------------------
select tests.authenticate(:'owner_a');
select throws_like(format($$select public.rpc_grant_support_access(%L, 500, null)$$, :'biz_a'), '%AZ_INVALID_INPUT%', 'a grant longer than 7 days is refused');
select throws_like(format($$select public.rpc_grant_support_access(%L, 0, null)$$, :'biz_a'), '%AZ_INVALID_INPUT%', 'a zero-hour grant is refused');
select ok((public.rpc_grant_support_access(:'biz_a', 24, 'Balance looks wrong') ->> 'expires_at') is not null, 'owner grants 24 hours');
select ok((public.rpc_list_support_access(:'biz_a') -> 'active') is not null, 'owner sees the live grant');
select tests.clear_auth();

select tests.authenticate(:'admin');
select is(public.rpc_admin_open_business(:'biz_a') ->> 'name', 'Zqx Support Shop A', 'admin opens the shop the owner allowed');
select is((select count(*) from public.transactions where business_id = :'biz_a'), 1::bigint, 'admin with a grant reads that shop''s entries');
select is((public.rpc_get_dashboard_summary(:'biz_a', current_date - 1, current_date + 1) ->> 'sales_minor'), '10000', 'admin with a grant reads that shop''s dashboard');
select is((select count(*) from public.transactions where business_id = :'biz_b'), 0::bigint, 'a grant for Shop A does not open Shop B');
select throws_like(format($$select public.rpc_admin_open_business(%L)$$, :'biz_b'), '%AZ_SUPPORT_NOT_GRANTED%', 'admin still cannot open Shop B');

-- 4. Support access is read-only: every kind of write is refused ------------------------------------
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 100, 100, %L, null, null, 'x', null)$$, :'biz_a', :'cash_a'), '%AZ_FORBIDDEN%', 'admin cannot record a sale');
select throws_like(format($$select public.rpc_reverse_transaction(gen_random_uuid(), %L, %L, 'support')$$, :'biz_a', :'sale_a'), '%AZ_FORBIDDEN%', 'admin cannot reverse an entry');
select throws_like(format($$select public.rpc_record_owner_movement(gen_random_uuid(), %L, now(), 100, %L, 'withdrawal', null)$$, :'biz_a', :'cash_a'), '%AZ_FORBIDDEN%', 'admin cannot move owner money');
select throws_like(format($$select public.rpc_export_business_data(%L)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'admin cannot download the whole shop');
select throws_like(format($$select public.rpc_grant_support_access(%L, 24, null)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'admin cannot extend their own access');
select throws_ok(format($$insert into public.contacts (business_id, name) values (%L, 'Planted')$$, :'biz_a'), '42501', null, 'admin cannot add a customer');
select lives_ok(format($$update public.businesses set name = 'Renamed' where id = %L$$, :'biz_a'), 'rename attempt by admin runs');
select tests.clear_auth();
select is((select name from public.businesses where id = :'biz_a'), 'Zqx Support Shop A', 'the shop name is unchanged: zero rows matched for the admin');

-- 5. Revoke and expiry both close the door ----------------------------------------------------------
select tests.authenticate(:'owner_a');
select is(public.rpc_revoke_support_access(:'biz_a') ->> 'revoked', '1', 'owner revokes the grant');
select tests.clear_auth();
select tests.authenticate(:'admin');
select is((select count(*) from public.transactions), 0::bigint, 'after revoke the admin reads nothing');
select tests.clear_auth();

select tests.authenticate(:'owner_a');
select public.rpc_grant_support_access(:'biz_a', 1, null);
select tests.clear_auth();
update public.support_grants set created_at = now() - interval '3 hours', expires_at = now() - interval '2 hours'
where business_id = :'biz_a' and revoked_at is null;
select tests.authenticate(:'admin');
select is((select count(*) from public.transactions), 0::bigint, 'after expiry the admin reads nothing');

-- 6. Suspend and reactivate --------------------------------------------------------------------------
select throws_like(format($$select public.rpc_admin_set_business_status(%L, 'suspended', '')$$, :'biz_b'), '%AZ_INVALID_INPUT%', 'suspending needs a reason');
select throws_like(format($$select public.rpc_admin_set_business_status(%L, 'archived', 'tidy up')$$, :'biz_b'), '%AZ_INVALID_INPUT%', 'admin can only set active or suspended');
select is(public.rpc_admin_set_business_status(:'biz_b', 'suspended', 'Reported fraud') ->> 'status', 'suspended', 'admin suspends Shop B');
select tests.clear_auth();
select tests.authenticate(:'owner_b');
select is((select count(*) from public.businesses), 0::bigint, 'a suspended shop is closed to its own members');
select tests.clear_auth();
select tests.authenticate(:'admin');
select is(public.rpc_admin_set_business_status(:'biz_b', 'active', 'Cleared') ->> 'status', 'active', 'admin reactivates Shop B');
select tests.clear_auth();
select tests.authenticate(:'owner_b');
select is((select count(*) from public.businesses), 1::bigint, 'the owner is back in after reactivation');
select tests.clear_auth();

-- 7. Everything support did is on the record ---------------------------------------------------------
select is((select count(*) from public.audit_events where business_id = :'biz_a' and action = 'support.granted'), 2::bigint, 'both grants are logged');
select is((select count(*) from public.audit_events where business_id = :'biz_a' and action = 'support.viewed' and actor_id = :'admin'), 1::bigint, 'the look is logged against the admin');
select is((select count(*) from public.audit_events where business_id = :'biz_a' and action = 'support.revoked'), 1::bigint, 'the revoke is logged');
select is((select count(*) from public.audit_events where business_id = :'biz_b' and action = 'support.status_changed'), 2::bigint, 'suspend and reactivate are logged');
select ok((select count(*) from public.audit_events where action = 'support.searched' and actor_id = :'admin') >= 2, 'searches are logged');

select * from finish();
rollback;
