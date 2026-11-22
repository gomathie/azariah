import { callRpc } from '@/lib/supabase/rpc'

/** One line of the shop directory. It carries no sales, balances or customers by design. */
export interface DirectoryShop {
  id: string
  name: string
  business_type: string
  country_code: string
  currency_code: string
  status: 'active' | 'suspended' | 'archived'
  created_at: string
  owner_email: string | null
  member_count: number
  last_entry_date: string | null
  support_expires_at: string | null
}

export async function listShops(search: string | null, before: string | null = null): Promise<DirectoryShop[]> {
  const rows = await callRpc<DirectoryShop[]>('rpc_admin_list_businesses', {
    p_search: search,
    p_limit: 25,
    p_before: before,
  })
  return rows ?? []
}

export async function setShopStatus(businessId: string, status: 'active' | 'suspended', reason: string) {
  return callRpc<{ id: string; status: string }>('rpc_admin_set_business_status', {
    p_business_id: businessId,
    p_status: status,
    p_reason: reason,
  })
}
