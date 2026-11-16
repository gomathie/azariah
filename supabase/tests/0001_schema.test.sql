begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- tables
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'businesses', 'businesses exists');
select has_table('public', 'business_memberships', 'business_memberships exists');
select has_table('public', 'money_accounts', 'money_accounts exists');
select has_table('public', 'categories', 'categories exists');
select has_table('public', 'contacts', 'contacts exists');
select has_table('public', 'transactions', 'transactions exists');
select has_table('public', 'money_movements', 'money_movements exists');
select has_table('public', 'receivables', 'receivables exists');
select has_table('public', 'credit_allocations', 'credit_allocations exists');
select has_table('public', 'audit_events', 'audit_events exists');
select has_table('public', 'sync_operations', 'sync_operations exists');
select has_table('public', 'attachments', 'attachments exists');
select has_view('public', 'v_account_balances', 'v_account_balances exists');
select has_view('public', 'v_customer_balances', 'v_customer_balances exists');

-- money is bigint minor units (ADR-001)
select col_type_is('public', 'transactions', 'amount_minor', 'bigint', 'transactions.amount_minor is bigint');
select col_type_is('public', 'money_movements', 'amount_minor', 'bigint', 'money_movements.amount_minor is bigint');
select col_type_is('public', 'receivables', 'amount_minor', 'bigint', 'receivables.amount_minor is bigint');

-- business-date index for daybook/report queries (ADR-005)
select has_index('public', 'transactions', 'transactions_business_date_idx', 'daybook index exists');

-- replay key
select col_is_unique('public', 'sync_operations', 'client_operation_id', 'sync_operations.client_operation_id is unique');

-- RLS enabled on every business-owned table
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0::bigint,
  'every public table has RLS enabled'
);

-- views do not bypass RLS
select ok(
  (select coalesce(reloptions::text, '') like '%security_invoker=true%' from pg_class where relname = 'v_account_balances'),
  'v_account_balances is security_invoker'
);
select ok(
  (select coalesce(reloptions::text, '') like '%security_invoker=true%' from pg_class where relname = 'v_customer_balances'),
  'v_customer_balances is security_invoker'
);

-- anon has no table privileges at all
select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'),
  0::bigint,
  'anon has no grants on public tables'
);

select * from finish();
rollback;
