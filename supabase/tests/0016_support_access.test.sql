begin;
create extension if not exists pgtap with schema extensions;
select plan(81);

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
select tests.create_user('helper@example.test') as helper \gset
insert into public.platform_admins (user_id, note, is_super) values (:'admin', 'test admin', true);

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
select throws_like(format($$select public.rpc_admin_open_business(%L, true)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'ordinary user cannot open someone else''s shop');
select throws_ok(format($$insert into public.platform_admins (user_id) values (%L)$$, :'nobody'), '42501', null, 'nobody can insert themselves as admin');
select throws_ok($$select count(*) from public.platform_admins$$, '42501', null, 'the admin list is not readable through the API');
select throws_ok($$select count(*) from public.support_sessions$$, '42501', null, 'open-shop records are not readable through the API');
select throws_like($$select public.rpc_admin_save_admin('nobody@example.test', array['edit_shops'], true)$$, '%AZ_FORBIDDEN%', 'ordinary user cannot make themselves an admin through the function');
select throws_like($$select public.rpc_admin_list_admins()$$, '%AZ_FORBIDDEN%', 'ordinary user cannot list admins');
select tests.clear_auth();

-- 2. A superadmin who has not opened a shop sees the directory and nothing inside any shop -----------
select tests.authenticate(:'admin');
select is(public.rpc_admin_whoami() ->> 'is_super', 'true', 'the superadmin is recognised');
select is(jsonb_array_length(public.rpc_admin_whoami() -> 'rights'), 4, 'a superadmin holds every right');
select is((select count(*) from public.businesses), 0::bigint, 'before opening a shop the admin sees no business rows');
select is((select count(*) from public.transactions), 0::bigint, 'before opening a shop the admin sees no entries');
select throws_like(format($$select public.rpc_get_dashboard_summary(%L, current_date, current_date)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'before opening a shop the admin cannot read its dashboard');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 100, 100, %L, null, null, 'x', null)$$, :'biz_a', :'cash_a'), '%AZ_FORBIDDEN%', 'before opening a shop the admin cannot write in it');
select public.rpc_admin_list_businesses('Zqx Support Shop') as directory \gset
select is(jsonb_array_length((:'directory')::jsonb), 2, 'directory lists both shops');
select ok(not ((:'directory')::jsonb -> 0) ?| array['sales_minor','balance_minor','amount_minor','contacts','transactions'], 'directory rows carry no money or customer fields');
select is(jsonb_array_length(public.rpc_admin_list_businesses('owner-a@')), 1, 'admin can find a shop by its owner''s email');
select is(jsonb_array_length(public.rpc_admin_list_businesses('%')), 0, 'a percent sign in the search is matched literally, not as a wildcard');
select throws_like($$select public.rpc_admin_open_business(gen_random_uuid())$$, '%AZ_NOT_FOUND%', 'opening a shop that does not exist is refused');

-- 3. Opened to look: reads that shop only, writes nothing ---------------------------------------------
select is(public.rpc_admin_open_business(:'biz_a') ->> 'can_edit', 'false', 'superadmin opens Shop A to look, with no grant from the owner');
select is((select count(*) from public.transactions where business_id = :'biz_a'), 1::bigint, 'the admin reads the open shop''s entries');
select is((public.rpc_get_dashboard_summary(:'biz_a', current_date - 1, current_date + 1) ->> 'sales_minor'), '10000', 'the admin reads the open shop''s dashboard');
select is((select count(*) from public.transactions where business_id = :'biz_b'), 0::bigint, 'opening Shop A does not open Shop B');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 100, 100, %L, null, null, 'x', null)$$, :'biz_a', :'cash_a'), '%AZ_FORBIDDEN%', 'a shop opened to look cannot be written to, even by a superadmin');
select throws_ok(format($$insert into public.contacts (business_id, name) values (%L, 'Planted')$$, :'biz_a'), '42501', null, 'a shop opened to look takes no direct insert');

-- 4. Opened for changes: the superadmin can do what the owner can -------------------------------------
select is(public.rpc_admin_open_business(:'biz_a', true) ->> 'can_edit', 'true', 'superadmin opens Shop A for changes');
select ok((public.rpc_create_sale(gen_random_uuid(), :'biz_a', now(), 2500, 2500, :'cash_a', null, null, 'Support fix', null) ->> 'transaction_id') is not null, 'superadmin records a sale in the shop');
select ok(public.rpc_reverse_transaction(gen_random_uuid(), :'biz_a', :'sale_a', 'entered twice') is not null, 'superadmin reverses an entry in the shop');
select is((select count(*) from public.transactions where business_id = :'biz_a' and created_by = :'admin'), 2::bigint, 'what the admin wrote is stored under the admin, not the owner');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 100, 100, %L, null, null, 'x', null)$$, :'biz_b', :'cash_b'), '%AZ_FORBIDDEN%', 'the open Shop A does not let the admin write in Shop B');

-- 5. Closing and time both shut the door --------------------------------------------------------------
select public.rpc_admin_close_business(:'biz_a');
select is((select count(*) from public.transactions), 0::bigint, 'after closing the shop the admin reads nothing');
select public.rpc_admin_open_business(:'biz_a', true);
select tests.clear_auth();
update public.support_sessions set expires_at = now() - interval '1 minute' where admin_id = :'admin';
select tests.authenticate(:'admin');
select is((select count(*) from public.transactions), 0::bigint, 'after two hours the open shop closes by itself');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 100, 100, %L, null, null, 'x', null)$$, :'biz_a', :'cash_a'), '%AZ_FORBIDDEN%', 'and nothing can be written after that');

-- 6. The superadmin decides what other admins can do --------------------------------------------------
select throws_like($$select public.rpc_admin_save_admin('nobody-registered@example.test', array['view_shops'])$$, '%AZ_NOT_FOUND%', 'a person without an account cannot be made an admin');
select throws_like($$select public.rpc_admin_save_admin('helper@example.test', array['everything'])$$, '%AZ_INVALID_INPUT%', 'an unknown right is refused');
select throws_like($$select public.rpc_admin_save_admin('support@example.test', array[]::text[], false)$$, '%AZ_INVALID_INPUT%', 'a superadmin cannot change their own entry');
select throws_like(format($$select public.rpc_admin_remove_admin(%L)$$, :'admin'), '%AZ_INVALID_INPUT%', 'a superadmin cannot remove themselves');
select is(public.rpc_admin_save_admin('helper@example.test', array['view_shops']) ->> 'is_super', 'false', 'superadmin adds a helper who may only look');
select is((select count(*) from jsonb_array_elements(public.rpc_admin_list_admins()) e where e ->> 'email' in ('support@example.test', 'helper@example.test')), 2::bigint, 'the superadmin sees both admins');
select tests.clear_auth();

select tests.authenticate(:'helper');
select is(public.rpc_admin_whoami() -> 'rights', '["view_shops"]'::jsonb, 'the helper is told exactly which rights they hold');
select is(public.rpc_admin_open_business(:'biz_a') ->> 'name', 'Zqx Support Shop A', 'the helper opens a shop to look');
select is((select count(*) from public.transactions where business_id = :'biz_a'), 3::bigint, 'the helper reads the shop');
select throws_like(format($$select public.rpc_admin_open_business(%L, true)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'a helper without the edit right cannot open a shop for changes');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 100, 100, %L, null, null, 'x', null)$$, :'biz_a', :'cash_a'), '%AZ_FORBIDDEN%', 'a helper without the edit right cannot record a sale');
select throws_like(format($$select public.rpc_start_trial(gen_random_uuid(), %L)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'a helper without the edit right cannot start a Plus trial for the shop');
select throws_like(format($$select public.rpc_billing_start_payment(gen_random_uuid(), %L, 'plus_1m')$$, :'biz_a'), '%AZ_FORBIDDEN%', 'a helper without the edit right cannot start a payment for the shop');
select throws_like(format($$select public.rpc_export_business_data(%L)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'a helper without the edit right cannot download the whole shop');
select throws_like(format($$select public.rpc_admin_set_business_status(%L, 'suspended', 'because')$$, :'biz_b'), '%AZ_FORBIDDEN%', 'a helper without the suspend right cannot suspend a shop');
select throws_like($$select public.rpc_admin_list_discount_codes()$$, '%AZ_FORBIDDEN%', 'a helper without the billing right cannot see discount codes');
select throws_like($$select public.rpc_admin_set_payments_on(true)$$, '%AZ_FORBIDDEN%', 'a helper without the billing right cannot turn payments on');
select throws_like($$select public.rpc_admin_save_admin('nobody@example.test', array['edit_shops'])$$, '%AZ_FORBIDDEN%', 'a helper cannot add admins');
select throws_like($$select public.rpc_admin_save_admin('helper@example.test', array['edit_shops'], true)$$, '%AZ_FORBIDDEN%', 'a helper cannot give themselves more rights');
select tests.clear_auth();

select tests.authenticate(:'admin');
select public.rpc_admin_save_admin('helper@example.test', array['edit_shops', 'billing']);
select tests.clear_auth();
select tests.authenticate(:'helper');
select is(public.rpc_admin_open_business(:'biz_a', true) ->> 'can_edit', 'true', 'with the edit right the helper opens a shop for changes');
select ok((public.rpc_create_sale(gen_random_uuid(), :'biz_a', now(), 700, 700, :'cash_a', null, null, 'Helper fix', null) ->> 'transaction_id') is not null, 'and records a sale');
select lives_ok($$select public.rpc_admin_list_discount_codes()$$, 'with the billing right the helper sees discount codes');
select tests.clear_auth();

select tests.authenticate(:'admin');
select public.rpc_admin_save_admin('helper@example.test', array['view_shops']);
select tests.clear_auth();
select tests.authenticate(:'helper');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 100, 100, %L, null, null, 'x', null)$$, :'biz_a', :'cash_a'), '%AZ_FORBIDDEN%', 'taking the edit right away stops writes at once, with the shop still open');
select is((select count(*) from public.transactions where business_id = :'biz_a'), 4::bigint, 'but the helper can still look');
select tests.clear_auth();

select tests.authenticate(:'admin');
select is(public.rpc_admin_remove_admin(:'helper') ->> 'removed', 'true', 'superadmin removes the helper');
select tests.clear_auth();
select tests.authenticate(:'helper');
select is(public.rpc_admin_whoami() ->> 'is_platform_admin', 'false', 'a removed helper is no longer an admin');
select is((select count(*) from public.transactions), 0::bigint, 'and reads nothing');
select tests.clear_auth();

-- 6b. Admins see created accounts -----------------------------------------------------------------------
select tests.authenticate(:'nobody');
select throws_like($$select public.rpc_admin_list_accounts()$$, '%AZ_FORBIDDEN%', 'an ordinary user cannot list accounts');
select tests.clear_auth();
select tests.authenticate(:'admin');
select public.rpc_admin_list_accounts('nobody@example.test') as accounts \gset
select is(jsonb_array_length((:'accounts')::jsonb), 1, 'admin finds an account by email, also one with no shop');
select is(jsonb_array_length((:'accounts')::jsonb -> 0 -> 'shops'), 0, 'an account without a shop shows no shops');
select ok(not ((:'accounts')::jsonb -> 0) ?| array['encrypted_password','password','phone','raw_user_meta_data'], 'account rows carry no password or profile data');
select is((public.rpc_admin_list_accounts('owner-a@example.test') -> 0 -> 'shops' -> 0 ->> 'role'), 'owner', 'an account shows the shops it belongs to with the role');
select is(jsonb_array_length(public.rpc_admin_list_accounts('_')), 0, 'an underscore in the search is matched literally');
select tests.clear_auth();

-- 7. Suspend and reactivate --------------------------------------------------------------------------
select tests.authenticate(:'admin');
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

-- 8. The owner can see what support did, and everything is on the record -----------------------------
select tests.authenticate(:'owner_a');
select ok(jsonb_array_length(public.rpc_list_support_access(:'biz_a') -> 'history') >= 4, 'the owner sees each time support opened the shop');
select tests.clear_auth();
select is((select count(*) from public.audit_events where business_id = :'biz_a' and action = 'support.viewed' and actor_id = :'admin'), 1::bigint, 'the look is logged against the admin');
select is((select count(*) from public.audit_events where business_id = :'biz_a' and action = 'support.edit_opened' and actor_id = :'admin'), 2::bigint, 'each opening for changes is logged against the admin');
select is((select count(*) from public.audit_events where business_id = :'biz_a' and action like 'support.%' and actor_id = :'helper'), 2::bigint, 'the helper''s openings are logged against the helper');
select is((select count(*) from public.audit_events where action = 'admin.saved' and actor_id = :'admin'), 3::bigint, 'every change of rights is logged');
select is((select count(*) from public.audit_events where action = 'admin.removed' and actor_id = :'admin'), 1::bigint, 'removing an admin is logged');
select is((select count(*) from public.audit_events where business_id = :'biz_b' and action = 'support.status_changed'), 2::bigint, 'suspend and reactivate are logged');
select ok((select count(*) from public.audit_events where action = 'support.searched' and actor_id = :'admin') >= 2, 'searches are logged');

select * from finish();
rollback;
