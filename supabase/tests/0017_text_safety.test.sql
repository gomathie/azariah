begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

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

select tests.create_user('safety@example.test') as uid \gset
select tests.create_user('support-safety@example.test') as admin \gset
insert into public.platform_admins (user_id) values (:'admin');

select tests.authenticate(:'uid');

-- 1. Text that looks like a command is stored as the text it is, and nothing runs ----------------
select (public.rpc_create_business_and_owner(gen_random_uuid(), $$Zqx'); DROP TABLE public.contacts;-- Shop$$, 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select is((select name from public.businesses where id = :'biz'), $$Zqx'); DROP TABLE public.contacts;-- Shop$$, 'a shop name with SQL in it is stored word for word');
select id as cash from public.money_accounts where business_id = :'biz' and type = 'cash' \gset

insert into public.contacts (business_id, name, phone)
values (:'biz', $$Robert'); DELETE FROM public.transactions; --$$, '+233 24 000 0001') returning id as bobby \gset
select is((select name from public.contacts where id = :'bobby'), $$Robert'); DELETE FROM public.transactions; --$$, 'a customer name with SQL in it is stored word for word');

select (public.rpc_create_sale(gen_random_uuid(), :'biz', now(), 5000, 2000, :'cash', :'bobby', null,
  $$<script>alert('x')</script> =HYPERLINK("http://evil.example","pay") $(rm -rf /)$$, $$'; select pg_sleep(10); --$$) ->> 'transaction_id') as sale \gset
select is((select description from public.transactions where id = :'sale'),
  $$<script>alert('x')</script> =HYPERLINK("http://evil.example","pay") $(rm -rf /)$$, 'markup, a formula and a shell command in a description are stored word for word');
select is((select note from public.transactions where id = :'sale'), $$'; select pg_sleep(10); --$$, 'SQL in a note is stored word for word');
select has_table('public', 'contacts', 'the contacts table is still there');
select is((select count(*) from public.transactions where business_id = :'biz'), 1::bigint, 'the sale is still there; nothing was deleted');
select is((select outstanding_minor from public.v_customer_balances where contact_id = :'bobby'), 3000::bigint, 'the figures are right: the customer owes 30');

-- 2. Invisible and direction-override characters are removed ---------------------------------------
insert into public.contacts (business_id, name, notes)
values (:'biz', 'Ko' || chr(8) || 'fi' || U&'\200B' || ' Men' || U&'\202E' || 'sah', 'line one' || chr(10) || 'line' || chr(7) || ' two')
returning id as kofi \gset
select is((select name from public.contacts where id = :'kofi'), 'Kofi Mensah', 'control, zero-width and override characters are removed from a name');
select is((select notes from public.contacts where id = :'kofi'), 'line one' || chr(10) || 'line two', 'a new line is kept in notes; the bell character is removed');
update public.contacts set name = 'Ama' || U&'\FEFF' where id = :'kofi';
select is((select name from public.contacts where id = :'kofi'), 'Ama', 'cleaning also runs on update');
select is((select description from public.transactions where id = (
  public.rpc_record_expense(gen_random_uuid(), :'biz', now(), 100, :'cash',
    (select id from public.categories where business_id = :'biz' and kind = 'operating_expense' limit 1),
    'Tro' || chr(27) || 'tro', null) ->> 'transaction_id')::uuid), 'Trotro', 'cleaning runs for rows written by functions too');
select is(public.clean_text('Café ₵ 12,50 — "quoted" <b> = ; '' ok'), 'Café ₵ 12,50 — "quoted" <b> = ; '' ok', 'visible characters are never changed');

-- 3. A phone number holds a phone number -----------------------------------------------------------
select throws_ok(format($$insert into public.contacts (business_id, name, phone) values (%L, 'Bad phone', '024; rm -rf /')$$, :'biz'), '23514', null, 'a phone with a command in it is refused');
select throws_ok(format($$insert into public.contacts (business_id, name, phone) values (%L, 'Bad phone', '<img src=x>')$$, :'biz'), '23514', null, 'a phone with markup in it is refused');
select throws_ok(format($$insert into public.contacts (business_id, name, phone) values (%L, 'Bad phone', '+++')$$, :'biz'), '23514', null, 'a phone with no digits is refused');
select lives_ok(format($$insert into public.contacts (business_id, name, phone) values (%L, 'Good phone', '(024) 000-0001')$$, :'biz'), 'a phone as people write it is accepted');
select lives_ok(format($$insert into public.contacts (business_id, name, phone) values (%L, 'No phone', '   ')$$, :'biz'), 'a blank phone is stored as none');
select is((select phone from public.contacts where business_id = :'biz' and name = 'No phone'), null, 'the blank phone is null');

-- 4. Length limits ----------------------------------------------------------------------------------
select throws_ok(format($$insert into public.contacts (business_id, name, notes) values (%L, 'Long notes', repeat('x', 1001))$$, :'biz'), '23514', null, 'notes over 1000 characters are refused');
select throws_like(format($$select public.rpc_create_sale(gen_random_uuid(), %L, now(), 100, 100, %L, null, null, repeat('x', 241), null)$$, :'biz', :'cash'), '%', 'a description over 240 characters is refused');
select tests.clear_auth();

-- 5. Search text is data, not a pattern or a query ---------------------------------------------------
select tests.authenticate(:'admin');
select is(jsonb_array_length(public.rpc_admin_list_businesses($$Zqx'); DROP TABLE$$)), 1, 'searching for text with SQL in it finds the shop by that text');
select is(jsonb_array_length(public.rpc_admin_list_businesses($$' or '1'='1$$)), 0, 'an always-true condition typed into search matches nothing');
select is(jsonb_array_length(public.rpc_admin_list_businesses('Zqx_); DROP')), 0, 'an underscore in search is not a wildcard');
select tests.clear_auth();
select has_table('public', 'businesses', 'the businesses table is still there');

-- 6. Twi is an accepted profile language -------------------------------------------------------------
select lives_ok(format($$update public.profiles set locale = 'tw' where id = %L$$, :'uid'), 'profile language can be Twi');
select throws_ok(format($$update public.profiles set locale = 'xx' where id = %L$$, :'uid'), '23514', null, 'an unknown profile language is refused');

select * from finish();
rollback;
