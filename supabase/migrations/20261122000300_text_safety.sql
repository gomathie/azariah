-- Text safety. Whatever a person types is data: stored as text, never run.
--
-- What already holds, and this migration does not change:
--   * Every function takes its inputs as typed parameters. No function builds SQL from text.
--   * Search text is escaped before LIKE, so % and _ are matched literally.
--
-- What this migration adds, for every way a row can be written (app, forged request, SQL console):
--   1. Invisible control characters and text-direction overrides are removed from names, notes and
--      descriptions. They are used to hide or reorder text ("invoice<override>fdp.exe").
--      Visible characters are kept exactly, including quotes, angle brackets and equals signs.
--   2. A phone number may hold only digits, spaces and + ( ) . -
--   3. Free-text columns that had no limit get one.

create or replace function public.clean_text(p_text text)
returns text
language sql immutable
set search_path = public, pg_temp
as $$
  -- Kept: tab (09), new line (0A), carriage return (0D). Removed: other C0 and C1 controls, DEL,
  -- zero-width characters, direction marks and overrides, and the byte-order mark.
  select regexp_replace(
    p_text,
    '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]',
    '',
    'g'
  );
$$;

create or replace function public.clean_businesses() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.name := public.clean_text(new.name);
  return new;
end $$;
create trigger businesses_clean_text before insert or update of name on public.businesses
  for each row execute function public.clean_businesses();

create or replace function public.clean_named_row() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.name := public.clean_text(new.name);
  return new;
end $$;
create trigger money_accounts_clean_text before insert or update of name on public.money_accounts
  for each row execute function public.clean_named_row();
create trigger categories_clean_text before insert or update of name on public.categories
  for each row execute function public.clean_named_row();

create or replace function public.clean_contacts() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.name := public.clean_text(new.name);
  new.phone := nullif(btrim(public.clean_text(new.phone)), '');
  new.notes := public.clean_text(new.notes);
  return new;
end $$;
create trigger contacts_clean_text before insert or update of name, phone, notes on public.contacts
  for each row execute function public.clean_contacts();

create or replace function public.clean_transactions() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.description := public.clean_text(new.description);
  new.note := public.clean_text(new.note);
  new.reference := public.clean_text(new.reference);
  return new;
end $$;
create trigger transactions_clean_text before insert or update of description, note, reference on public.transactions
  for each row execute function public.clean_transactions();

create or replace function public.clean_shop_people() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.name := public.clean_text(new.name);
  new.device_name := public.clean_text(new.device_name);
  return new;
end $$;
create trigger shop_people_clean_text before insert or update of name, device_name on public.shop_people
  for each row execute function public.clean_shop_people();

create or replace function public.clean_documents() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.business_name := public.clean_text(new.business_name);
  new.contact_name := public.clean_text(new.contact_name);
  new.description := public.clean_text(new.description);
  return new;
end $$;
create trigger documents_clean_text before insert or update of business_name, contact_name, description on public.documents
  for each row execute function public.clean_documents();

create or replace function public.clean_support_grants() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.reason := public.clean_text(new.reason);
  return new;
end $$;
create trigger support_grants_clean_text before insert or update of reason on public.support_grants
  for each row execute function public.clean_support_grants();

create or replace function public.clean_profiles() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.display_name := left(public.clean_text(new.display_name), 120);
  return new;
end $$;
create trigger profiles_clean_text before insert or update of display_name on public.profiles
  for each row execute function public.clean_profiles();

-- Trigger functions are not callable through the API.
revoke all on function public.clean_businesses(), public.clean_named_row(), public.clean_contacts(),
  public.clean_transactions(), public.clean_shop_people(), public.clean_documents(),
  public.clean_support_grants(), public.clean_profiles() from public, anon, authenticated;
revoke all on function public.clean_text(text) from public, anon;
grant execute on function public.clean_text(text) to authenticated;

-- Limits. NOT VALID: rows already stored are left alone; every new or changed row is checked.
alter table public.contacts
  add constraint contacts_phone_format
    check (phone is null or (length(phone) <= 32 and phone ~ '^[0-9+() .-]+$' and phone ~ '[0-9]')) not valid,
  add constraint contacts_notes_length check (notes is null or length(notes) <= 1000) not valid;
alter table public.transactions
  add constraint transactions_reference_length check (reference is null or length(reference) <= 120) not valid;
alter table public.documents
  add constraint documents_text_length check (
    length(business_name) <= 120
    and (contact_name is null or length(contact_name) <= 120)
    and (description is null or length(description) <= 240)
  ) not valid;

-- The profile language may now be Twi.
alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles add constraint profiles_locale_check check (locale in ('en', 'fr', 'tw'));
