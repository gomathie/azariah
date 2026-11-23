begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- helpers --------------------------------------------------------------------
create schema if not exists tests;
grant usage on schema tests to anon, authenticated;
-- An account made the way Supabase makes it when "Confirm email" is off:
-- marked confirmed at once, with no confirmation email sent.
create or replace function tests.create_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
  return v_id;
end $$;
-- Signs in as the person; p_method is how the session began ('password', 'otp', ...).
create or replace function tests.authenticate_with(p_uid uuid, p_method text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated',
    'amr', json_build_array(json_build_object('method', p_method, 'timestamp', 1795000000))
  )::text, true);
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

-- the table is closed ----------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.email_confirmations'::regclass),
  'row security is on for email_confirmations');
select ok(not has_table_privilege('authenticated', 'public.email_confirmations', 'select'),
  'a signed-in person cannot read the table directly');
select ok(not has_table_privilege('authenticated', 'public.email_confirmations', 'insert'),
  'a signed-in person cannot mark themselves confirmed directly');
select ok(not has_function_privilege('anon', 'public.rpc_email_confirmation()', 'execute'),
  'a visitor who is not signed in cannot call the function');

-- a new account that signed in with a password is not confirmed ---------------
select tests.create_user('emailcheck-kofi@example.test') as kofi \gset
select tests.authenticate_with(:'kofi', 'password');
select public.rpc_email_confirmation() as r1 \gset
select is((:'r1'::jsonb ->> 'confirmed')::boolean, false, 'a password sign-in does not confirm the email');
select is(:'r1'::jsonb ->> 'email', 'emailcheck-kofi@example.test', 'the answer names the email to confirm');
select tests.clear_auth();
select is((select count(*) from public.email_confirmations where user_id = :'kofi'), 0::bigint,
  'nothing is recorded for a password sign-in');

-- a session that began from a code sent to the mailbox confirms it ------------
select tests.authenticate_with(:'kofi', 'otp');
select public.rpc_email_confirmation() as r2 \gset
select is((:'r2'::jsonb ->> 'confirmed')::boolean, true, 'a sign-in with the emailed code confirms the email');

-- and it stays confirmed on a later password sign-in --------------------------
select tests.authenticate_with(:'kofi', 'password');
select public.rpc_email_confirmation() as r3 \gset
select is((:'r3'::jsonb ->> 'confirmed')::boolean, true, 'the email stays confirmed on a later password sign-in');
select tests.clear_auth();

-- a changed email needs confirming again --------------------------------------
update auth.users set email = 'emailcheck-kofi2@example.test' where id = :'kofi';
select tests.authenticate_with(:'kofi', 'password');
select public.rpc_email_confirmation() as r4 \gset
select is((:'r4'::jsonb ->> 'confirmed')::boolean, false, 'a new email address is not confirmed by the old one');
select tests.clear_auth();

-- a person who followed Supabase's own confirmation email counts --------------
select tests.create_user('emailcheck-esi@example.test') as esi \gset
update auth.users set confirmation_sent_at = now() - interval '1 minute', email_confirmed_at = now() where id = :'esi';
select tests.authenticate_with(:'esi', 'password');
select public.rpc_email_confirmation() as r5 \gset
select is((:'r5'::jsonb ->> 'confirmed')::boolean, true, 'following the confirmation email counts as confirmed');
select tests.clear_auth();

select * from finish();
rollback;
