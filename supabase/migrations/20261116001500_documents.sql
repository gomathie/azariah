-- Invoices and receipts are numbered papers for a sale or a payment already recorded.
-- Issuing one does not create a sale, a movement, or a debt. One issued paper of each kind per entry.
-- Reversing the entry marks its papers cancelled. Numbers are not reused.

create table public.document_counters (
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('invoice', 'receipt')),
  last_number integer not null default 0 check (last_number >= 0),
  primary key (business_id, kind)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id),
  kind text not null check (kind in ('invoice', 'receipt')),
  status text not null default 'issued' check (status in ('issued', 'void')),
  number integer not null check (number > 0),
  display_number text not null,
  business_name text not null,
  contact_name text,
  description text,
  total_minor bigint not null check (total_minor > 0),
  received_minor bigint not null check (received_minor >= 0),
  outstanding_minor bigint not null check (outstanding_minor >= 0),
  currency_code char(3) not null,
  business_date date not null,
  client_operation_id uuid not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (business_id, client_operation_id),
  unique (business_id, kind, number)
);

create unique index documents_one_issued_idx
  on public.documents (business_id, transaction_id, kind)
  where status = 'issued';

create index documents_business_idx
  on public.documents (business_id, business_date desc, created_at desc);

alter table public.document_counters enable row level security;
alter table public.documents enable row level security;
revoke all on public.document_counters from anon, authenticated;
revoke all on public.documents from anon, authenticated;
grant select on public.documents to authenticated;

create policy documents_select on public.documents
  for select to authenticated
  using (public.is_member(business_id));

create or replace function public.document_payload(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'document_id', d.id,
    'kind', d.kind,
    'status', d.status,
    'display_number', d.display_number,
    'transaction_id', d.transaction_id,
    'business_name', d.business_name,
    'contact_name', d.contact_name,
    'description', d.description,
    'total_minor', d.total_minor,
    'received_minor', d.received_minor,
    'outstanding_minor', d.outstanding_minor,
    'currency_code', d.currency_code,
    'business_date', d.business_date
  )
  from public.documents d
  where d.id = p_id;
$$;

revoke all on function public.document_payload(uuid) from public, anon, authenticated;

create or replace function public.rpc_issue_document(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_transaction_id uuid,
  p_kind text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_tx public.transactions%rowtype;
  v_business_name text;
  v_contact_name text;
  v_received bigint;
  v_outstanding bigint;
  v_total bigint;
  v_number integer;
  v_id uuid;
  v_prefix text;
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner,manager,staff}');

  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  if p_client_operation_id is null or p_transaction_id is null or p_kind not in ('invoice', 'receipt') then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  select * into v_tx
  from public.transactions
  where id = p_transaction_id and business_id = p_business_id
  for update;

  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;

  if v_tx.status <> 'posted' then
    raise exception 'AZ_ALREADY_REVERSED' using errcode = '22023';
  end if;

  if p_kind = 'invoice' and v_tx.kind <> 'sale' then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  if p_kind = 'receipt' and v_tx.kind not in ('sale', 'collection') then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  select d.id into v_id
  from public.documents d
  where d.business_id = p_business_id
    and d.transaction_id = v_tx.id
    and d.kind = p_kind
    and d.status = 'issued';

  if v_id is not null then
    v_result := public.document_payload(v_id);
    return public.sync_record(p_business_id, p_client_operation_id, 'issue_document', v_result);
  end if;

  select coalesce(sum(amount_minor), 0) into v_received
  from public.money_movements
  where transaction_id = v_tx.id and amount_minor > 0;

  if p_kind = 'invoice' then
    v_total := v_tx.amount_minor;
    v_outstanding := v_total - v_received;
  else
    if v_received <= 0 then
      raise exception 'AZ_NO_MONEY_RECEIVED' using errcode = '22023';
    end if;
    v_total := v_received;
    v_outstanding := case when v_tx.kind = 'sale' then v_tx.amount_minor - v_received else 0 end;
  end if;

  select name into v_business_name from public.businesses where id = p_business_id;
  select name into v_contact_name from public.contacts where id = v_tx.contact_id and business_id = p_business_id;

  insert into public.document_counters (business_id, kind, last_number)
  values (p_business_id, p_kind, 1)
  on conflict (business_id, kind) do update
  set last_number = public.document_counters.last_number + 1
  returning last_number into v_number;

  v_prefix := case when p_kind = 'invoice' then 'INV-' else 'RCT-' end;

  insert into public.documents (
    business_id, transaction_id, kind, number, display_number, business_name, contact_name,
    description, total_minor, received_minor, outstanding_minor, currency_code, business_date,
    client_operation_id, created_by
  ) values (
    p_business_id, v_tx.id, p_kind, v_number, v_prefix || lpad(v_number::text, 4, '0'),
    v_business_name, v_contact_name, coalesce(v_tx.description, v_tx.note),
    v_total, v_received, v_outstanding, v_tx.currency_code, v_tx.business_date,
    p_client_operation_id, auth.uid()
  ) returning id into v_id;

  perform public.audit(p_business_id, 'document.issued', 'document', v_id,
    jsonb_build_object('kind', p_kind, 'transaction_id', v_tx.id, 'display_number', v_prefix || lpad(v_number::text, 4, '0')));

  v_result := public.document_payload(v_id);
  return public.sync_record(p_business_id, p_client_operation_id, 'issue_document', v_result);
exception
  when unique_violation then
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end $$;

revoke all on function public.rpc_issue_document(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.rpc_issue_document(uuid, uuid, uuid, text) to authenticated;

create or replace function public.rpc_get_document(
  p_business_id uuid,
  p_document_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_business uuid;
begin
  perform public.assert_member(p_business_id, '{owner,manager,staff}');
  select business_id into v_business from public.documents where id = p_document_id;
  if v_business is null or v_business <> p_business_id then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  return public.document_payload(p_document_id);
end $$;

revoke all on function public.rpc_get_document(uuid, uuid) from public, anon;
grant execute on function public.rpc_get_document(uuid, uuid) to authenticated;

-- Reversing an entry cancels the papers that were issued for it.
create or replace function public.rpc_reverse_transaction(
  p_client_operation_id uuid,
  p_business_id uuid,
  p_transaction_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing jsonb;
  v_tx public.transactions%rowtype;
  v_new uuid;
  v_rec record;
  v_remaining bigint;
  v_date date;
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner,manager}');

  v_existing := public.sync_replay(p_client_operation_id);
  if v_existing is not null then
    return v_existing;
  end if;

  if p_client_operation_id is null or p_transaction_id is null or length(btrim(coalesce(p_reason, ''))) < 1 then
    raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id and business_id = p_business_id for update;
  if not found then
    raise exception 'AZ_NOT_FOUND' using errcode = '22023';
  end if;
  if v_tx.status = 'reversed' or v_tx.kind = 'reversal' then
    raise exception 'AZ_ALREADY_REVERSED' using errcode = '22023';
  end if;

  v_date := public.business_local_date(p_business_id, now());

  insert into public.transactions (
    business_id, kind, occurred_at, business_date, amount_minor, currency_code,
    description, note, reverses_transaction_id, client_operation_id, created_by
  ) values (
    p_business_id, 'reversal', now(), v_date, v_tx.amount_minor, v_tx.currency_code,
    v_tx.description, btrim(p_reason), v_tx.id, p_client_operation_id, auth.uid()
  ) returning id into v_new;

  insert into public.money_movements (business_id, transaction_id, money_account_id, amount_minor, occurred_at, business_date)
  select p_business_id, v_new, money_account_id, -amount_minor, now(), v_date
  from public.money_movements
  where transaction_id = v_tx.id;

  for v_rec in
    select * from public.receivables where transaction_id = v_tx.id and status <> 'reversed' for update
  loop
    select v_rec.amount_minor - coalesce(sum(amount_minor), 0) into v_remaining
    from public.credit_allocations where receivable_id = v_rec.id;
    if v_remaining <> 0 then
      insert into public.credit_allocations (business_id, receivable_id, transaction_id, amount_minor)
      values (p_business_id, v_rec.id, v_new, -v_remaining);
    end if;
    update public.receivables set status = 'reversed' where id = v_rec.id;
  end loop;

  update public.transactions
  set status = 'reversed', reversed_by_transaction_id = v_new
  where id = v_tx.id;

  update public.documents
  set status = 'void'
  where business_id = p_business_id and transaction_id = v_tx.id and status = 'issued';

  perform public.audit(p_business_id, 'transaction.reversed', 'transaction', v_tx.id,
    jsonb_build_object('reversal_id', v_new, 'reason', btrim(p_reason)));

  v_result := jsonb_build_object(
    'transaction_id', v_new,
    'reverses_transaction_id', v_tx.id,
    'business_date', v_date
  );
  return public.sync_record(p_business_id, p_client_operation_id, 'reversal', v_result);
exception
  when unique_violation then
    v_existing := public.sync_replay(p_client_operation_id);
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end $$;

revoke all on function public.rpc_reverse_transaction(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.rpc_reverse_transaction(uuid, uuid, uuid, text) to authenticated;

create or replace function public.rpc_export_business_data(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.assert_member(p_business_id, '{owner}');

  select jsonb_build_object(
    'business', (select to_jsonb(b) from public.businesses b where b.id = p_business_id),
    'accounts', coalesce((select jsonb_agg(to_jsonb(a)) from public.money_accounts a where a.business_id = p_business_id), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c)) from public.categories c where c.business_id = p_business_id), '[]'::jsonb),
    'contacts', coalesce((select jsonb_agg(to_jsonb(c)) from public.contacts c where c.business_id = p_business_id), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t)) from public.transactions t where t.business_id = p_business_id), '[]'::jsonb),
    'movements', coalesce((select jsonb_agg(to_jsonb(m)) from public.money_movements m where m.business_id = p_business_id), '[]'::jsonb),
    'receivables', coalesce((select jsonb_agg(to_jsonb(r)) from public.receivables r where r.business_id = p_business_id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(to_jsonb(d)) from public.documents d where d.business_id = p_business_id), '[]'::jsonb)
  ) into v_result;

  perform public.audit(p_business_id, 'export.created', 'business', p_business_id, null);
  return v_result;
end $$;

revoke all on function public.rpc_export_business_data(uuid) from public, anon;
grant execute on function public.rpc_export_business_data(uuid) to authenticated;
