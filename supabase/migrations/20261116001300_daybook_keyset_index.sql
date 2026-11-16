-- Daybook pages walk (business_date, created_at, id) newest first.
-- The earlier date index stops before id, so the last-row comparison would sort again.

create index if not exists transactions_daybook_keyset_idx
  on public.transactions (business_id, business_date desc, created_at desc, id desc);
