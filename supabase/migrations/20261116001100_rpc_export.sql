-- Owner download of the business records. Staff cannot export the whole business.

create or replace function public.rpc_export_business_data(p_business_id uuid)
returns jsonb
language plpgsql security definer
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
    'receivables', coalesce((select jsonb_agg(to_jsonb(r)) from public.receivables r where r.business_id = p_business_id), '[]'::jsonb)
  ) into v_result;

  perform public.audit(p_business_id, 'export.created', 'business', p_business_id, null);
  return v_result;
end $$;

revoke all on function public.rpc_export_business_data(uuid) from public, anon;
grant execute on function public.rpc_export_business_data(uuid) to authenticated;
