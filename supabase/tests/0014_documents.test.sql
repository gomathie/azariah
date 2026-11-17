begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

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

select tests.create_user('docs-owner@example.test') as uid \gset
select tests.create_user('docs-other@example.test') as uid_other \gset
select tests.create_user('docs-staff@example.test') as uid_staff \gset

select tests.authenticate(:'uid');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Ama Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz \gset
select id as cash from public.money_accounts where business_id = :'biz' and type = 'cash' \gset
insert into public.contacts (business_id, name) values (:'biz', 'Kofi') returning id as kofi \gset

select tests.authenticate(:'uid_other');
select (public.rpc_create_business_and_owner(gen_random_uuid(), 'Other Shop', 'retail', 'GH', 'Africa/Accra', 'GHS') ->> 'business_id') as biz_other \gset
select tests.clear_auth();
select tests.authenticate(:'uid');

select public.rpc_create_sale('11111111-0000-0000-0000-0000000000d1', :'biz', now(), 10000, 6000, :'cash', :'kofi', null, 'Rice', null) as sale \gset
select ((:'sale')::jsonb ->> 'transaction_id') as tx \gset

select public.rpc_issue_document('22222222-0000-0000-0000-0000000000d1', :'biz', :'tx', 'invoice') as inv \gset
select is(((:'inv')::jsonb ->> 'display_number'), 'INV-0001', 'invoice number starts at INV-0001');
select is(((:'inv')::jsonb ->> 'total_minor'), '10000', 'invoice total is the sale');
select is(((:'inv')::jsonb ->> 'received_minor'), '6000', 'invoice shows money received');
select is(((:'inv')::jsonb ->> 'outstanding_minor'), '4000', 'invoice shows what is still owed');
select is(((:'inv')::jsonb ->> 'contact_name'), 'Kofi', 'invoice names the customer');
select is(
  public.rpc_issue_document('22222222-0000-0000-0000-0000000000d1', :'biz', :'tx', 'invoice'),
  (:'inv')::jsonb,
  'replaying the same request returns the same invoice'
);
select is(
  (public.rpc_issue_document(gen_random_uuid(), :'biz', :'tx', 'invoice') ->> 'display_number'),
  'INV-0001',
  'a second request does not mint another invoice'
);
select is(
  (select count(*) from public.documents where transaction_id = :'tx' and kind = 'invoice' and status = 'issued'),
  1::bigint,
  'one issued invoice for the sale'
);

select is(
  (public.rpc_issue_document(gen_random_uuid(), :'biz', :'tx', 'receipt') ->> 'display_number'),
  'RCT-0001',
  'receipt number starts at RCT-0001'
);

select public.rpc_create_sale(gen_random_uuid(), :'biz', now(), 5000, 0, null, :'kofi', null, 'Oil', null) as unpaid \gset
select throws_like(
  format($$select public.rpc_issue_document(gen_random_uuid(), %L, %L, 'receipt')$$, :'biz', (:'unpaid')::jsonb ->> 'transaction_id'),
  '%AZ_NO_MONEY_RECEIVED%',
  'a sale with no money received has no receipt'
);

select public.rpc_record_collection(gen_random_uuid(), :'biz', now(), :'kofi', 4000, :'cash', null) as collected \gset
select throws_like(
  format($$select public.rpc_issue_document(gen_random_uuid(), %L, %L, 'invoice')$$, :'biz', (:'collected')::jsonb ->> 'transaction_id'),
  '%AZ_INVALID_INPUT%',
  'a later payment is not an invoice'
);
select is(
  (public.rpc_issue_document(gen_random_uuid(), :'biz', (:'collected')::jsonb ->> 'transaction_id', 'receipt') ->> 'total_minor'),
  '4000',
  'a receipt for a later payment is the money received'
);

select tests.clear_auth();
select tests.authenticate(:'uid_other');
select throws_like(
  format($$select public.rpc_issue_document(gen_random_uuid(), %L, %L, 'invoice')$$, :'biz', :'tx'),
  '%AZ_FORBIDDEN%',
  'another shop cannot issue a paper'
);
select is(
  (select count(*) from public.documents where business_id = :'biz'),
  0::bigint,
  'another shop cannot read the papers'
);

select tests.clear_auth();
select tests.authenticate(:'uid');
select public.rpc_reverse_transaction(gen_random_uuid(), :'biz', :'tx', 'Wrong rice');
select is(
  (select status from public.documents where id = ((:'inv')::jsonb ->> 'document_id')::uuid),
  'void',
  'reversing the sale cancels its invoice'
);
select throws_like(
  format($$select public.rpc_issue_document(gen_random_uuid(), %L, %L, 'invoice')$$, :'biz', :'tx'),
  '%AZ_ALREADY_REVERSED%',
  'a reversed sale cannot get a new invoice'
);

select throws_like(
  format(
    $$insert into public.documents (
      business_id, transaction_id, kind, number, display_number, business_name,
      total_minor, received_minor, outstanding_minor, currency_code, business_date,
      client_operation_id, created_by
    ) values (%L, %L, 'invoice', 9, 'INV-0009', 'Ama', 100, 0, 100, 'GHS', current_date, gen_random_uuid(), %L)$$,
    :'biz', :'tx', :'uid'
  ),
  '%permission denied%',
  'members cannot insert a paper directly'
);

select public.rpc_invite_member(gen_random_uuid(), :'biz', 'docs-staff@example.test', 'staff');
select tests.clear_auth();
select tests.authenticate(:'uid_staff');
select public.rpc_create_sale(gen_random_uuid(), :'biz', now(), 2000, 2000, :'cash', null, null, 'Soap', null) as staff_sale \gset
select is(
  (public.rpc_issue_document(gen_random_uuid(), :'biz', (:'staff_sale')::jsonb ->> 'transaction_id', 'invoice') ->> 'display_number'),
  'INV-0002',
  'staff can issue the next invoice'
);

select * from finish();
rollback;
