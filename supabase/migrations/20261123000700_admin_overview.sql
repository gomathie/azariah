-- Numbers for the first screen of the admin console. Counts only: no names, no money.
-- Counted in the database so the screen stays fast however many shops there are.
create or replace function public.rpc_admin_overview()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_platform_admin();
  return jsonb_build_object(
    'shops_total', (select count(*) from public.businesses),
    'shops_suspended', (select count(*) from public.businesses where status = 'suspended'),
    'shops_new_7d', (select count(*) from public.businesses where created_at > now() - interval '7 days'),
    'shops_active_7d', (
      select count(distinct t.business_id) from public.transactions t
      where t.created_at > now() - interval '7 days'
    ),
    'accounts_total', (select count(*) from auth.users),
    'accounts_new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'accounts_no_shop', (
      select count(*) from auth.users u
      where not exists (select 1 from public.business_memberships m where m.user_id = u.id and m.status = 'active')
        and not exists (select 1 from public.platform_admins a where a.user_id = u.id)
    ),
    'shops_paid', (select count(*) from public.business_entitlements where plus_until > now()),
    'payments_on', public.billing_payments_on(),
    'team', (select count(*) from public.platform_admins)
  );
end $$;
revoke all on function public.rpc_admin_overview() from public, anon;
grant execute on function public.rpc_admin_overview() to authenticated;
