begin;
create extension if not exists pgtap with schema extensions;
select plan(71);

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

select tests.create_user('bill-owner-a@example.test') as owner_a \gset
select tests.create_user('bill-owner-b@example.test') as owner_b \gset
select tests.create_user('bill-staff@example.test') as staff \gset
select tests.create_user('bill-admin@example.test') as admin \gset
insert into public.platform_admins (user_id, note) values (:'admin', 'billing test admin');

select tests.authenticate(:'owner_a');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Zqx Billing Shop A', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz_a \gset
select tests.clear_auth();
select tests.authenticate(:'owner_b');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Zqx Billing Shop B', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz_b \gset
select tests.clear_auth();
insert into public.business_memberships (business_id, user_id, role, status) values (:'biz_a', :'staff', 'staff', 'active');
select amount_minor as price_1m from public.billing_products where code = 'plus_1m' \gset

-- 0. Payments are off until the platform admin turns them on ------------------------------------------
select is(public.billing_payments_on(), false, 'payments start switched off');
select tests.authenticate(:'owner_a');
select is(public.has_plus(:'biz_a'), true, 'while payments are off every shop has Plus');
select is((public.rpc_billing_status(:'biz_a') ->> 'payments_on')::boolean, false, 'the status says payments are off');
select is((public.rpc_billing_status(:'biz_a') ->> 'can_pay')::boolean, false, 'while payments are off nobody is asked to pay');
select throws_like(format($$select public.rpc_start_trial(gen_random_uuid(), %L)$$, :'biz_a'), '%AZ_PAYMENT_UNAVAILABLE%', 'no trial can be used up while payments are off');
select throws_like(format($$select public.rpc_billing_start_payment(gen_random_uuid(), %L, 'plus_1m')$$, :'biz_a'), '%AZ_PAYMENT_UNAVAILABLE%', 'no payment can be started while payments are off');
select throws_like($$select public.rpc_admin_set_payments_on(true)$$, '%AZ_FORBIDDEN%', 'an owner cannot turn payments on');
select throws_like($$select public.rpc_admin_update_billing_product('plus_1m', 1, true)$$, '%AZ_FORBIDDEN%', 'an owner cannot change a plan');
select throws_like($$select public.rpc_admin_billing_settings()$$, '%AZ_FORBIDDEN%', 'an owner cannot read the admin payment settings');
select throws_ok($$select public.billing_payments_on()$$, '42501', null, 'the switch itself is closed to the API');
select throws_ok($$update public.billing_settings set payments_on = true$$, '42501', null, 'the settings table is closed to the API');
select tests.clear_auth();
select tests.authenticate(:'admin');
select throws_like($$select public.rpc_admin_update_billing_product('plus_1m', 0, true)$$, '%AZ_INVALID_INPUT%', 'a plan cannot be free or negative');
select throws_like($$select public.rpc_admin_update_billing_product('nope', 100, true)$$, '%AZ_NOT_FOUND%', 'an unknown plan is refused');
select public.rpc_admin_update_billing_product('plus_3m', 7500, false);
select is((select jsonb_array_length(public.rpc_admin_billing_settings() -> 'products')), 3, 'the admin sees every plan, also one that is not offered');
select public.rpc_admin_set_payments_on(true);
select tests.clear_auth();
select tests.authenticate(:'owner_a');
select is(public.has_plus(:'biz_a'), false, 'once payments are on, a shop that has not paid has no Plus');
select is((public.rpc_billing_status(:'biz_a') ->> 'can_pay')::boolean, true, 'once payments are on the owner can pay');
select is((select jsonb_array_length(public.rpc_billing_status(:'biz_a') -> 'products')), 2, 'a plan the admin stopped is not offered');
select tests.clear_auth();
select tests.authenticate(:'admin');
select public.rpc_admin_update_billing_product('plus_3m', 8000, true);
select tests.clear_auth();
select is((select count(*) from public.audit_events where action in ('billing.payments_switched', 'billing.product_changed')), 3::bigint, 'the switch and plan changes are written to the audit trail');

-- 1. Tables are closed and row security is on ---------------------------------------------------------
select ok((select bool_and(relrowsecurity) from pg_class where relname in
  ('billing_products','billing_payments','business_entitlements','billing_events','discount_codes')
  and relnamespace = 'public'::regnamespace), 'row security is on for every billing table');

select tests.authenticate(:'owner_a');
select throws_ok(format($$insert into public.business_entitlements (business_id, plus_until) values (%L, now() + interval '10 years')$$, :'biz_a'), '42501', null, 'an owner cannot give their own shop Plus');
select throws_ok($$update public.billing_products set amount_minor = 1$$, '42501', null, 'an owner cannot change a price');
select throws_ok($$select count(*) from public.discount_codes$$, '42501', null, 'discount codes cannot be listed through the API');
select throws_ok($$select count(*) from public.billing_events$$, '42501', null, 'webhook events cannot be read through the API');
select throws_ok($$select public.billing_apply_payment('azp-00000000000000000000000000000000', 1, 'GHS')$$, '42501', null, 'an owner cannot mark a payment paid');
select throws_ok($$select public.billing_mark_paid(gen_random_uuid(), 'x', now())$$, '42501', null, 'the internal paid step is closed to the API');
select throws_ok($$select public.billing_record_event('k', 't', null, '{}'::jsonb)$$, '42501', null, 'an owner cannot plant a webhook event');

-- 2. Status and trial ---------------------------------------------------------------------------------
select is(public.rpc_billing_status(:'biz_a') ->> 'has_plus', 'false', 'a new shop has no Plus');
select is(public.rpc_billing_status(:'biz_a') ->> 'trial_available', 'true', 'a new shop can start a trial');
select is(jsonb_array_length(public.rpc_billing_status(:'biz_a') -> 'products'), 3, 'three periods are on sale');
select tests.clear_auth();

select tests.authenticate(:'staff');
select throws_like(format($$select public.rpc_start_trial(gen_random_uuid(), %L)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'staff cannot start a trial');
select throws_like(format($$select public.rpc_billing_start_payment(gen_random_uuid(), %L, 'plus_1m')$$, :'biz_a'), '%AZ_FORBIDDEN%', 'staff cannot start a payment');
select is(public.rpc_billing_status(:'biz_a') ->> 'can_pay', 'false', 'staff are told they cannot pay');
select is(jsonb_array_length(public.rpc_billing_status(:'biz_a') -> 'payments'), 0, 'staff see no payment history');
select tests.clear_auth();

select tests.authenticate(:'owner_a');
select gen_random_uuid() as trial_op \gset
select public.rpc_start_trial(:'trial_op', :'biz_a') as trial_1 \gset
select is(public.rpc_billing_status(:'biz_a') ->> 'has_plus', 'true', 'the trial turns Plus on');
select is(public.rpc_start_trial(:'trial_op', :'biz_a')::text, (:'trial_1')::jsonb::text, 'the same trial request sent twice gives the same answer');
select throws_like(format($$select public.rpc_start_trial(gen_random_uuid(), %L)$$, :'biz_a'), '%AZ_TRIAL_USED%', 'the trial works once');
select is(public.has_plus(:'biz_a'), true, 'has_plus is true for a member');
select tests.clear_auth();
select tests.authenticate(:'owner_b');
select is(public.has_plus(:'biz_a'), false, 'has_plus is false for someone outside the shop');
select throws_like(format($$select public.rpc_billing_status(%L)$$, :'biz_a'), '%AZ_FORBIDDEN%', 'another shop''s owner cannot read the status');
select tests.clear_auth();

-- 3. Paying -------------------------------------------------------------------------------------------
select tests.authenticate(:'owner_a');
select throws_like(format($$select public.rpc_billing_start_payment(gen_random_uuid(), %L, 'plus_99m')$$, :'biz_a'), '%AZ_INVALID_INPUT%', 'an unknown period is refused');
select public.rpc_billing_start_payment(gen_random_uuid(), :'biz_a', 'plus_1m') as pay_1 \gset
select is(((:'pay_1')::jsonb ->> 'amount_minor')::bigint, :price_1m::bigint, 'the price comes from the products table');
select is((:'pay_1')::jsonb ->> 'status', 'pending', 'a new payment is pending');
select (:'pay_1')::jsonb ->> 'reference' as ref_1 \gset
select plus_until as until_trial from public.business_entitlements where business_id = :'biz_a' \gset
select tests.clear_auth();

select is((select plus_until from public.business_entitlements where business_id = :'biz_a'), (:'until_trial')::timestamptz, 'a pending payment gives nothing');
select throws_like(format($$select public.billing_apply_payment(%L, 1, 'GHS')$$, :'ref_1'), '%AZ_INVALID_AMOUNT%', 'a smaller amount than asked is refused');
select throws_like(format($$select public.billing_apply_payment(%L, %s, 'NGN')$$, :'ref_1', :price_1m), '%AZ_INVALID_AMOUNT%', 'another currency is refused');
select throws_like($$select public.billing_apply_payment('azp-ffffffffffffffffffffffffffffffff', 1, 'GHS')$$, '%AZ_NOT_FOUND%', 'an unknown reference is refused');
select public.billing_apply_payment(:'ref_1', :price_1m, 'GHS', 'mobile_money', now()) as applied_1 \gset
select is((:'applied_1')::jsonb ->> 'already_paid', 'false', 'the payment is applied');
select is((select plus_until from public.business_entitlements where business_id = :'biz_a'), (:'until_trial')::timestamptz + interval '1 month', 'paying early adds a month to the existing date');
select public.billing_apply_payment(:'ref_1', :price_1m, 'GHS', 'mobile_money', now()) as applied_2 \gset
select is((:'applied_2')::jsonb ->> 'already_paid', 'true', 'the same reference a second time is recognised');
select is((select plus_until from public.business_entitlements where business_id = :'biz_a'), (:'until_trial')::timestamptz + interval '1 month', 'a repeated webhook adds no time');
select is(public.billing_record_event('evt-zqx-1', 'charge.success', :'ref_1', '{}'::jsonb), true, 'a new webhook event is stored');
select is(public.billing_record_event('evt-zqx-1', 'charge.success', :'ref_1', '{}'::jsonb), false, 'a replayed webhook event is not stored twice');

-- 4. Grace --------------------------------------------------------------------------------------------
update public.business_entitlements set plus_until = now() - interval '6 days' where business_id = :'biz_a';
select tests.authenticate(:'owner_a');
select is(public.rpc_billing_status(:'biz_a') ->> 'in_grace', 'true', 'six days after the date the shop is in grace');
select is(public.rpc_billing_status(:'biz_a') ->> 'has_plus', 'true', 'Plus stays on during grace');
select tests.clear_auth();
update public.business_entitlements set plus_until = now() - interval '8 days' where business_id = :'biz_a';
select tests.authenticate(:'owner_a');
select is(public.rpc_billing_status(:'biz_a') ->> 'has_plus', 'false', 'eight days after the date Plus is off');
select is(jsonb_array_length(public.rpc_billing_status(:'biz_a') -> 'payments'), 1, 'the owner sees the payment');
select tests.clear_auth();
select tests.authenticate(:'owner_b');
select is((select count(*) from public.billing_payments), 0::bigint, 'another shop''s payments are invisible');
select tests.clear_auth();

-- 5. Discount codes -----------------------------------------------------------------------------------
select tests.authenticate(:'owner_a');
select throws_like($$select public.rpc_admin_create_discount_code('ZQXOWNER', 50)$$, '%AZ_FORBIDDEN%', 'an owner cannot make a discount code');
select throws_like($$select public.rpc_admin_list_discount_codes()$$, '%AZ_FORBIDDEN%', 'an owner cannot list discount codes');
select tests.clear_auth();

select tests.authenticate(:'admin');
select throws_like($$select public.rpc_admin_create_discount_code('ZQXBAD', 0)$$, '%AZ_INVALID_INPUT%', 'zero percent is refused');
select throws_like($$select public.rpc_admin_create_discount_code('ab', 10)$$, '%AZ_INVALID_INPUT%', 'a code shorter than six characters is refused');
select public.rpc_admin_create_discount_code('zqxhalf1', 50, 30, null, 'Market day') ->> 'id' as code_half \gset
select throws_like($$select public.rpc_admin_create_discount_code('ZQXHALF1', 20)$$, '%AZ_DISCOUNT_EXISTS%', 'the same code cannot be made twice');
select ok((public.rpc_admin_create_discount_code('ZQXFREE1', 100, null, 1) ->> 'valid_until') is null, 'a code with no period never runs out');
select tests.clear_auth();

select tests.authenticate(:'owner_a');
select is(public.rpc_check_discount_code(:'biz_a', ' zqxhalf1 ') ->> 'percent_off', '50', 'the owner can check a code, in any case and with spaces');
select throws_like(format($$select public.rpc_check_discount_code(%L, 'ZQXNOPE1')$$, :'biz_a'), '%AZ_DISCOUNT_INVALID%', 'a wrong code is refused');
select is((public.rpc_billing_start_payment(gen_random_uuid(), :'biz_a', 'plus_1m', 'ZQXHALF1') ->> 'amount_minor')::bigint, :price_1m::bigint / 2, 'a 50% code halves the price');
select public.rpc_billing_start_payment(gen_random_uuid(), :'biz_a', 'plus_3m', 'ZQXFREE1') as free_1 \gset
select is((:'free_1')::jsonb ->> 'status', 'paid', 'a 100% code turns Plus on with nothing to pay');
select is(public.rpc_billing_status(:'biz_a') ->> 'has_plus', 'true', 'Plus is on after the free code');
select tests.clear_auth();

select tests.authenticate(:'owner_b');
select throws_like(format($$select public.rpc_billing_start_payment(gen_random_uuid(), %L, 'plus_3m', 'ZQXFREE1')$$, :'biz_b'), '%AZ_DISCOUNT_INVALID%', 'a code limited to one use cannot be used a second time');
select tests.clear_auth();

-- A code that has run out, and one that was switched off.
update public.discount_codes set valid_until = now() - interval '1 minute' where id = :'code_half';
select tests.authenticate(:'owner_b');
select throws_like(format($$select public.rpc_check_discount_code(%L, 'ZQXHALF1')$$, :'biz_b'), '%AZ_DISCOUNT_INVALID%', 'a code past its date is refused');
select tests.clear_auth();
update public.discount_codes set valid_until = null where id = :'code_half';
select tests.authenticate(:'admin');
select public.rpc_admin_set_discount_code_active(:'code_half', false);
select tests.clear_auth();
select tests.authenticate(:'owner_b');
select throws_like(format($$select public.rpc_check_discount_code(%L, 'ZQXHALF1')$$, :'biz_b'), '%AZ_DISCOUNT_INVALID%', 'a code that was switched off is refused');
select tests.clear_auth();

select * from finish();
rollback;
