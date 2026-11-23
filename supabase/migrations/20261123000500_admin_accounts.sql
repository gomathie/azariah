-- Admins can see every account that was created, also one that has no shop yet (ADR-011).
-- The list holds what is needed to help a person: email, when they signed up, whether the email
-- was confirmed, when they last signed in, and the shops they belong to with their role.
-- No password data and no money. Newest first; pass the last created_at as p_before for the next page.
create or replace function public.rpc_admin_list_accounts(
  p_search text default null, p_limit integer default 25, p_before timestamptz default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_term text := nullif(btrim(coalesce(p_search, '')), '');
  v_like text;
  v_rows jsonb;
begin
  perform public.assert_platform_admin();
  if v_term is not null then
    if length(v_term) > 100 then
      raise exception 'AZ_INVALID_INPUT' using errcode = '22023';
    end if;
    -- The search text is data, never a pattern: % and _ are matched literally.
    v_like := '%' || replace(replace(replace(v_term, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    perform public.audit(null, 'support.accounts_searched', 'user', null, jsonb_build_object('term', v_term));
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v_rows
  from (
    select
      u.id, u.email, u.created_at, u.last_sign_in_at,
      u.email_confirmed_at is not null as confirmed,
      exists (select 1 from public.platform_admins a where a.user_id = u.id) as is_admin,
      coalesce((
        select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'role', m.role, 'status', b.status)
                         order by b.created_at)
        from public.business_memberships m
        join public.businesses b on b.id = m.business_id
        where m.user_id = u.id and m.status = 'active'
      ), '[]'::jsonb) as shops
    from auth.users u
    where (p_before is null or u.created_at < p_before)
      and (v_like is null or u.email ilike v_like escape '\')
    order by u.created_at desc
    limit v_limit
  ) x;
  return v_rows;
end $$;
revoke all on function public.rpc_admin_list_accounts(text, integer, timestamptz) from public, anon;
grant execute on function public.rpc_admin_list_accounts(text, integer, timestamptz) to authenticated;
