-- People can now sign in straight after creating an account (the "Confirm email" switch in
-- Supabase Auth is turned off). With that switch off, Supabase marks every email as confirmed
-- and sends nothing, so the app keeps its own record of who has really proved their mailbox.
-- The app shows a reminder until a row exists here for the person's current email.

create table public.email_confirmations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  confirmed_at timestamptz not null default now()
);

-- No grant and no policy: the table is reachable only through the function below.
alter table public.email_confirmations enable row level security;
revoke all on table public.email_confirmations from public, anon, authenticated;

-- Accounts that exist today confirmed through the old link, or were made by hand (admins).
insert into public.email_confirmations (user_id, email, confirmed_at)
select u.id, lower(u.email), u.email_confirmed_at
from auth.users u
where u.email is not null and u.email_confirmed_at is not null
on conflict (user_id) do nothing;

-- Says whether the signed-in person's email is confirmed, and records it when this session
-- itself proves it. The proof is never taken from the browser's word:
--   * the session began from a code or link that Supabase sent to the mailbox (the signed
--     token's "amr" list says how the person signed in), or
--   * Supabase sent a confirmation email and the person followed it (only happens while the
--     "Confirm email" switch is on).
create or replace function public.rpc_email_confirmation()
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_sent timestamptz;
  v_confirmed timestamptz;
  v_proved boolean;
begin
  if v_uid is null then
    raise exception 'AZ_FORBIDDEN';
  end if;

  select lower(u.email), u.confirmation_sent_at, u.email_confirmed_at
    into v_email, v_sent, v_confirmed
  from auth.users u where u.id = v_uid;

  if v_email is null then
    return jsonb_build_object('confirmed', true, 'email', null);
  end if;

  if exists (select 1 from public.email_confirmations c where c.user_id = v_uid and c.email = v_email) then
    return jsonb_build_object('confirmed', true, 'email', v_email);
  end if;

  v_proved :=
    (v_sent is not null and v_confirmed is not null and v_confirmed >= v_sent)
    or exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end
      ) a
      where a ->> 'method' in ('otp', 'magiclink', 'recovery', 'invite', 'email/signup')
    );

  if v_proved then
    insert into public.email_confirmations (user_id, email)
    values (v_uid, v_email)
    on conflict (user_id) do update set email = excluded.email, confirmed_at = now();
  end if;

  return jsonb_build_object('confirmed', v_proved, 'email', v_email);
end $$;
revoke all on function public.rpc_email_confirmation() from public, anon;
grant execute on function public.rpc_email_confirmation() to authenticated;
